import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { setQueryOverride, splitStatements } from "./db";
import * as repo from "./repo";

let manager: repo.User;
let stranger: repo.User;
let propertyId: string;
const threadId = crypto.randomUUID();

beforeAll(async () => {
  const pg = new PGlite();
  setQueryOverride(async (text, params) => (await pg.query(text, params as unknown[])).rows as Record<string, unknown>[]);
  for (const sql of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(sql);
  manager = await repo.upsertUser("manager@test.local", "Manager");
  stranger = await repo.upsertUser("stranger@test.local", "Stranger");
  await repo.setStripeCustomer(manager.id, "cus_mgr_test");
  await repo.applySubscription({ customerId: "cus_mgr_test", subscriptionId: "sub_manager", status: "active", plan: "manager", eventCreated: 1900000000 });
  const property = await repo.createProperty(manager, { name: "The Lodge", location: "York", description: "" });
  propertyId = property.id;
});

describe("Manager automated portfolio triage", () => {
  it("keeps saved replies owner-scoped and never creates guest messages", async () => {
    const proposed = { title: "Check-out", body: "Please check out by 11 AM. Contact your host if you need help." };
    expect(await repo.createPortfolioReplyTemplate(stranger.id, proposed)).toBeNull();
    const template = await repo.createPortfolioReplyTemplate(manager.id, proposed);
    expect(template).toMatchObject(proposed);
    expect(await repo.listPortfolioReplyTemplates(stranger.id)).toEqual([]);
    expect(await repo.listPortfolioReplyTemplates(manager.id)).toContainEqual(template);
    expect(await repo.updatePortfolioReplyTemplate(stranger.id, template!.id, { ...proposed, body: "Altered" })).toBeNull();
    expect(await repo.deletePortfolioReplyTemplate(stranger.id, template!.id)).toBe(false);
    const revised = await repo.updatePortfolioReplyTemplate(manager.id, template!.id, { ...proposed, body: "New check-out text" });
    expect(revised?.body).toBe("New check-out text");
    expect(await repo.threadMessages(propertyId, threadId)).toEqual([]);
    expect(await repo.deletePortfolioReplyTemplate(manager.id, template!.id)).toBe(true);
    expect(await repo.listPortfolioReplyTemplates(manager.id)).toEqual([]);
  });

  it("uses a flat 10,000-message monthly allowance and has a real Stripe-backed plan", async () => {
    expect((await repo.getUser(manager.id))?.plan).toBe("manager");
    expect(repo.aiMessageLimit("manager", 40)).toBe(10000);
  });
  it("enforces owner identity and starts rules disabled", async () => {
    expect(await repo.createPortfolioRule(stranger.id, { keyword: "leak", label: "Maintenance", priority: "urgent" })).toBeNull();
    const rule = await repo.createPortfolioRule(manager.id, { keyword: "water leak", label: "Maintenance", priority: "urgent" });
    expect(rule?.enabled).toBe(false);
    expect(await repo.applyPortfolioRules(manager.id, propertyId, threadId, "There's a water leak")).toBe(false);
    expect(await repo.listPortfolioTriage(stranger.id)).toEqual([]);
    expect(await repo.setPortfolioRuleEnabled(stranger.id, rule!.id, true)).toBe(false);
    expect(await repo.setPortfolioRuleEnabled(manager.id, rule!.id, true)).toBe(true);
  });
  it("classifies an incoming guest message but does not reply or cross tenant boundaries", async () => {
    expect(await repo.applyPortfolioRules(manager.id, propertyId, threadId, "We have a water leak")).toBe(true);
    expect((await repo.listPortfolioTriage(manager.id))[0]).toMatchObject({ priority: "urgent", status: "open", label: "Maintenance", propertyName: "The Lodge" });
    expect(await repo.listPortfolioTriage(stranger.id)).toEqual([]);
    expect(await repo.setPortfolioTriageStatus(stranger.id, threadId, "resolved")).toBe(false);
    expect(await repo.setPortfolioTriageStatus(manager.id, threadId, "resolved")).toBe(true);
    expect((await repo.listPortfolioTriage(manager.id))[0].status).toBe("resolved");
    expect(await repo.applyPortfolioRules(stranger.id, propertyId, crypto.randomUUID(), "water leak")).toBe(false);
    expect(await repo.threadMessages(propertyId, threadId)).toEqual([]);
  });
  it("never downgrades an open urgent issue when a later normal rule matches", async () => {
    const rule = await repo.createPortfolioRule(manager.id, { keyword: "wifi", label: "Internet", priority: "normal" });
    await repo.setPortfolioRuleEnabled(manager.id, rule!.id, true);
    await repo.applyPortfolioRules(manager.id, propertyId, threadId, "water leak");
    await repo.applyPortfolioRules(manager.id, propertyId, threadId, "wifi password?");
    expect((await repo.listPortfolioTriage(manager.id))[0]).toMatchObject({ priority: "urgent", label: "Maintenance", status: "open" });
    await repo.setPortfolioTriageStatus(manager.id, threadId, "resolved");
    await repo.applyPortfolioRules(manager.id, propertyId, threadId, "wifi password?");
    expect((await repo.listPortfolioTriage(manager.id))[0]).toMatchObject({ priority: "normal", label: "Internet", status: "open" });
  });
  it("requires re-enabling edited rules and refuses edits by another owner or after downgrade", async () => {
    const rule = (await repo.listPortfolioRules(manager.id))[0];
    const edit = { keyword: "heating", label: "Heating", priority: "urgent" as const };
    expect(await repo.updatePortfolioRule(stranger.id, rule.id, edit)).toBeNull();
    expect(await repo.updatePortfolioRule(manager.id, rule.id, edit)).toMatchObject({ ...edit, enabled: false });
    await repo.setStripeCustomer(stranger.id, "cus_downgrade");
    await repo.applySubscription({ customerId: "cus_downgrade", subscriptionId: "sub_downgrade", status: "active", plan: "manager", eventCreated: 1900000000 });
    const own = await repo.createPortfolioRule(stranger.id, edit);
    // Signed-webhook processing maps past_due subscriptions to the free entitlement.
    await repo.applySubscription({ customerId: "cus_downgrade", subscriptionId: "sub_downgrade", status: "past_due", plan: "free", eventCreated: 1900000001 });
    expect(await repo.updatePortfolioRule(stranger.id, own!.id, edit)).toBeNull();
    expect(await repo.setPortfolioRuleEnabled(stranger.id, own!.id, true)).toBe(false);
  });
  it("enforces rule and template caps under concurrent creation", async () => {
    const rules = await Promise.all(Array.from({ length: 23 }, (_, i) => repo.createPortfolioRule(manager.id, { keyword: `limit ${i}`, label: "Limit", priority: "normal" })));
    expect(rules.filter(Boolean).length).toBe(18);
    expect((await repo.listPortfolioRules(manager.id)).length).toBe(20);
    const replies = await Promise.all(Array.from({ length: 33 }, (_, i) => repo.createPortfolioReplyTemplate(manager.id, { title: `Reply ${i}`, body: "Test reply" })));
    expect(replies.filter(Boolean).length).toBe(30);
    expect((await repo.listPortfolioReplyTemplates(manager.id)).length).toBe(30);
  });
  it("loads a linked conversation beyond the latest 50 without crossing owners", async () => {
    const old = crypto.randomUUID();
    await repo.saveMessages(propertyId, old, [{ role: "guest", content: "Old message", language: "en" }]);
    // Explicit timestamps make this independent of clock resolution.
    const { query } = await import("./db");
    await query("UPDATE chat_messages SET created_at = '2020-01-01' WHERE thread_id = $1", [old]);
    for (let i = 0; i < 51; i++) await repo.saveMessages(propertyId, crypto.randomUUID(), [{ role: "guest", content: `New ${i}`, language: "en" }]);
    expect((await repo.inbox(manager.id)).some(t => t.threadId === old)).toBe(false);
    expect((await repo.inbox(manager.id, old)).some(t => t.threadId === old)).toBe(true);
    expect(await repo.inbox(stranger.id, old)).toEqual([]);
  });
});
