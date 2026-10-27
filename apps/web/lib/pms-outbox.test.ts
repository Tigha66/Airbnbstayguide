import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setQueryOverride, splitStatements } from "./db";
import { runScheduledDelivery } from "./pms-scheduler";
import { approveOutbox, cancelOutbox, createOutboxDraft, deliverPmsBatch, listOutbox, pausePmsConnection, PmsSendError, type OutboxDraft } from "./pms-outbox";

let pg: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const property = "33333333-3333-4333-8333-333333333333";
const otherProperty = "44444444-4444-4444-8444-444444444444";
function activeZone() { const offset = new Date().getUTCHours() - 12; return `Etc/GMT${offset >= 0 ? "+" : ""}${offset}`; }
function quietZone() { const offset = new Date().getUTCHours() - 2; const normalized = offset > 12 ? offset - 24 : offset; return `Etc/GMT${normalized >= 0 ? "+" : ""}${normalized}`; }
const connection = "55555555-5555-4555-8555-555555555555";
function input(): OutboxDraft { return { propertyId: property, connectionId: connection, reservationId: "res-1", conversationId: "conv-1", body: "Your arrival guide is ready.", scheduledAt: new Date(Date.now() + 3600000).toISOString(), timeZone: activeZone(), idempotencyKey: crypto.randomUUID() }; }
const verify = vi.fn(async () => true);
const send = vi.fn(async () => ({ messageId: "provider-message-1" }));
const adapters = { guesty: { verify, send } };
async function due() { await pg.exec("UPDATE pms_outbox SET scheduled_at = now() - interval '1 minute'"); }
async function ready() {
  const data = input(); const row = (await createOutboxDraft(owner, data))!;
  expect(await approveOutbox(owner, row.id, row.contentHash)).toBe(true);
  await due(); return row;
}
beforeEach(async () => {

  vi.stubEnv("STAYGUIDE_PMS_DELIVERY_ENABLED", "true"); vi.stubEnv("MANAGER_ACCESS_EMAILS", "");
  verify.mockReset().mockResolvedValue(true); send.mockReset().mockResolvedValue({ messageId: "provider-message-1" });
  pg = new PGlite();
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(statement);
  setQueryOverride(async (text, params) => (await pg.query(text, params)).rows as Record<string, unknown>[]);
  await pg.query("INSERT INTO users(id,email,plan) VALUES ($1,'a@example.test','manager'),($2,'b@example.test','manager')", [owner, other]);
  await pg.query("INSERT INTO properties(id,owner_id,slug,status,data) VALUES ($1,$2,'a','draft','{}'),($3,$4,'b','draft','{}')", [property,owner,otherProperty,other]);
  await pg.query("INSERT INTO pms_connections(id,owner_id,provider,provider_account_id,status,paused,delivery_enabled) VALUES ($1,$2,'guesty','provider-account-a','verified',false,true)", [connection,owner]);
  await pg.query("INSERT INTO pms_property_links VALUES ($1,$2,'external-property-a')", [connection,property]);
});
afterEach(async () => { setQueryOverride(null); await pg.close(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("PMS durable delivery controls", () => {
  it("deduplicates exact drafts and rejects idempotency key reuse with changed content", async () => {
    const data = input(); const first = await createOutboxDraft(owner, data);
    expect((await createOutboxDraft(owner, data))?.id).toBe(first?.id);
    expect(await createOutboxDraft(owner, { ...data, body: "Different content" })).toBeNull();
    expect(await listOutbox(owner)).toHaveLength(1);
  });
  it("requires tenant-owned property and verified mapping; rejects spoofed owner fields", async () => {
    expect(await createOutboxDraft(other, input())).toBeNull();
    expect(await createOutboxDraft(owner, { ...input(), propertyId: otherProperty })).toBeNull();
    await expect(createOutboxDraft(owner, { ...input(), ownerId: other })).rejects.toThrow();
    await pg.exec("UPDATE pms_connections SET status = 'revoked'");
    expect(await createOutboxDraft(owner, input())).toBeNull();
    expect(await listOutbox(other)).toEqual([]);
  });
  it("rejects malformed dates, zones, past schedules and stale approval", async () => {
    await expect(createOutboxDraft(owner, { ...input(), timeZone: "Bogus/Zone" })).rejects.toThrow();
    await expect(createOutboxDraft(owner, { ...input(), scheduledAt: "2026-01-01T12:00:00Z" })).rejects.toThrow();
    const row = (await createOutboxDraft(owner, input()))!;
    expect(await approveOutbox(other, row.id, row.contentHash)).toBe(false);
    expect(await approveOutbox(owner, row.id, "a".repeat(64))).toBe(false);
    expect(await cancelOutbox(other, row.id)).toBe(false);
  });
  it("never sends drafts, cancelled messages or through an unregistered adapter", async () => {
    const row = (await createOutboxDraft(owner, input()))!;
    await due(); expect((await deliverPmsBatch(adapters)).processed).toBe(0);
    expect(await cancelOutbox(owner, row.id)).toBe(true);
    expect(await approveOutbox(owner, row.id, row.contentHash)).toBe(false);
    expect((await deliverPmsBatch(adapters)).processed).toBe(0);
    expect(await deliverPmsBatch({})).toEqual({ enabled: false, processed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
  it("claims once, revalidates the account/property/recipient and stores provider receipt and audit", async () => {
    const row = await ready();
    expect((await deliverPmsBatch(adapters)).processed).toBe(1);
    expect((await deliverPmsBatch(adapters)).processed).toBe(0);
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({ ownerId: owner, providerAccountId: "provider-account-a", externalPropertyId: "external-property-a", reservationId: "res-1", conversationId: "conv-1" }));
    expect(send).toHaveBeenCalledExactlyOnceWith(expect.anything(), "Your arrival guide is ready.", row.id);
    expect((await listOutbox(owner))[0]).toMatchObject({ status: "sent", attempts: 1, providerMessageId: "provider-message-1" });
    const audit = await pg.query("SELECT action FROM pms_delivery_audit ORDER BY action");
    expect(audit.rows).toEqual([{ action: "approved" }, { action: "sent" }]);
  });
  it("atomically claims a message across concurrent workers", async () => {
    await ready();
    const results = await Promise.all([deliverPmsBatch(adapters), deliverPmsBatch(adapters)]);
    expect(results.reduce((sum, r) => sum + r.processed, 0)).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("runs bounded scheduled batches and leaves future drafts unsent", async () => {
    for (let i = 0; i < 4; i++) await ready();
    await createOutboxDraft(owner, input());
    expect(await runScheduledDelivery(adapters)).toEqual({ status: "ok", processed: 3 });
    expect(send).toHaveBeenCalledTimes(3);
    expect(await runScheduledDelivery(adapters)).toEqual({ status: "ok", processed: 1 });
    expect(await runScheduledDelivery(adapters)).toEqual({ status: "ok", processed: 0 });
    expect(send).toHaveBeenCalledTimes(4);
    expect((await listOutbox(owner)).filter(m => m.status === "draft")).toHaveLength(1);
  });
  it("stops on revoked entitlement, paused connection or global disabled delivery", async () => {
    await ready();
    vi.stubEnv("STAYGUIDE_PMS_DELIVERY_ENABLED", "false"); expect((await deliverPmsBatch(adapters)).enabled).toBe(false);
    vi.stubEnv("STAYGUIDE_PMS_DELIVERY_ENABLED", "true");
    expect(await pausePmsConnection(other, connection, true)).toBe(false);
    expect(await pausePmsConnection(owner, connection, true)).toBe(true);
    expect((await deliverPmsBatch(adapters)).processed).toBe(0);
    await pausePmsConnection(owner, connection, false);
    await pg.query("UPDATE users SET plan = 'pro' WHERE id = $1", [owner]);
    expect((await deliverPmsBatch(adapters)).processed).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
  it("rechecks a pause after provider verification and cancels ineligible reservations", async () => {
    await ready(); verify.mockImplementationOnce(async () => { await pausePmsConnection(owner, connection, true); return true; });
    await deliverPmsBatch(adapters); expect(send).not.toHaveBeenCalled();
    expect((await listOutbox(owner))[0].status).toBe("cancelled");
    await pausePmsConnection(owner, connection, false); await ready(); verify.mockResolvedValue(false);
    await deliverPmsBatch(adapters); expect(send).not.toHaveBeenCalled();
    expect((await listOutbox(owner)).every(m => m.status === "cancelled")).toBe(true);
  });
  it("quarantines ambiguous send timeouts and stale leases without duplicate sends", async () => {
    await ready(); send.mockRejectedValue(new Error("Timeout may include sensitive provider response"));
    await deliverPmsBatch(adapters); await deliverPmsBatch(adapters);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await listOutbox(owner))[0]).toMatchObject({ status: "unknown", lastError: "provider_delivery_unconfirmed" });
    await ready(); await pg.exec("UPDATE pms_outbox SET status = 'sending', claimed_at = now() - interval '11 minutes' WHERE status = 'approved'");
    await deliverPmsBatch(adapters);
    expect((await listOutbox(owner)).every(m => m.status === "unknown")).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("backs off explicit safe rejections and caps retries at three", async () => {
    await ready(); send.mockRejectedValue(new PmsSendError("retryable"));
    await deliverPmsBatch(adapters); await deliverPmsBatch(adapters);
    expect(send).toHaveBeenCalledTimes(1);
    await pg.exec("UPDATE pms_outbox SET available_at = now() - interval '1 second', attempts = 2");
    await deliverPmsBatch(adapters); await deliverPmsBatch(adapters);
    expect(send).toHaveBeenCalledTimes(2);
    expect((await listOutbox(owner))[0]).toMatchObject({ status: "failed", attempts: 3 });
  });
  it("defers during local quiet hours while preserving approval content and attempts", async () => {
    const data = { ...input(), timeZone: quietZone() }; // UTC noon is 02:00 there.
    const row = (await createOutboxDraft(owner, data))!; await approveOutbox(owner, row.id, row.contentHash); await due();
    await deliverPmsBatch(adapters); await deliverPmsBatch(adapters);
    expect(send).not.toHaveBeenCalled(); expect(verify).not.toHaveBeenCalled();
    expect((await listOutbox(owner))[0]).toMatchObject({ status: "approved", attempts: 0, contentHash: row.contentHash });
  });
});
