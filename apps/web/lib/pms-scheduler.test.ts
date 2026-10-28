import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setQueryOverride, splitStatements } from "./db";
import { runScheduledDelivery, schedulerHealth, cronAuthorised, deliveryAdapters } from "./pms-scheduler";
import { GET } from "../app/api/cron/pms-delivery/route";
let pg: PGlite;
beforeEach(async () => {
  pg = new PGlite();
  for (const s of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(s);
  setQueryOverride(async (text, params) => (await pg.query(text, params)).rows as Record<string, unknown>[]);
  vi.stubEnv("CRON_SECRET", "scheduler-secret-" + "x".repeat(32)); vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("STAYGUIDE_PMS_DELIVERY_ENABLED", "false");
});
afterEach(async () => { setQueryOverride(null); await pg.close(); vi.unstubAllEnvs(); });
const req = (auth = `Bearer ${process.env.CRON_SECRET}`) => new Request("https://example.test/api/cron/pms-delivery", { headers: { authorization: auth } });
describe("scheduled delivery HTTP entrypoint and durable lease", () => {
  it("requires the secret even for disabled runs and rejects previews", async () => {
    expect((await GET(req(""))).status).toBe(401);
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
    expect(await schedulerHealth()).toBeNull();
    expect(cronAuthorised(req())).toBe(true);
    vi.stubEnv("CRON_SECRET", "short"); expect(cronAuthorised(req())).toBe(false);
    vi.stubEnv("CRON_SECRET", "x".repeat(32)); vi.stubEnv("VERCEL_ENV", "preview");
    expect((await GET(req())).status).toBe(403); expect(await schedulerHealth()).toBeNull();
  });
  it("records disabled and missing-provider status without false success heartbeats", async () => {
    const r = await GET(req()); expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ status: "disabled", processed: 0 });
    expect(await schedulerHealth()).toMatchObject({ status: "disabled", lastSuccessAt: null });
    expect(deliveryAdapters()).toEqual({});
    vi.stubEnv("STAYGUIDE_PMS_DELIVERY_ENABLED", "true");
    expect((await GET(req())).status).toBe(503);
    expect(await schedulerHealth()).toMatchObject({ status: "provider_not_connected", lastSuccessAt: null });
  });
  it("blocks overlapping invocations and recovers expired leases", async () => {
    await pg.query(`INSERT INTO pms_scheduler_state(job,lease_token,lease_until,started_at,status)
      VALUES ('delivery',$1,now()+interval '3 minutes',now(),'running')`, [crypto.randomUUID()]);
    expect(await runScheduledDelivery({})).toEqual({ status: "busy", processed: 0 });
    await pg.exec("UPDATE pms_scheduler_state SET lease_until=now()-interval '1 second'");
    expect(await runScheduledDelivery({})).toEqual({ status: "disabled", processed: 0 });
  });
  it("executes fixture-adapter batches and records successful worker health", async () => {
    vi.stubEnv("STAYGUIDE_PMS_DELIVERY_ENABLED", "true");
    expect(await runScheduledDelivery({ guesty: { verify: vi.fn(), send: vi.fn() } })).toEqual({ status: "ok", processed: 0 });
    expect(await schedulerHealth()).toMatchObject({ status: "ok", processed: 0, lastSuccessAt: expect.anything() });
  });
  it("records failures and releases the lease", async () => {
    vi.stubEnv("STAYGUIDE_PMS_DELIVERY_ENABLED", "true");
    await pg.exec("DROP TABLE pms_outbox CASCADE");
    await expect(runScheduledDelivery({ guesty: { verify: vi.fn(), send: vi.fn() } })).rejects.toThrow();
    expect(await schedulerHealth()).toMatchObject({ status: "failed", lastSuccessAt: null });
    expect(await runScheduledDelivery({})).toEqual({ status: "provider_not_connected", processed: 0 });
  });
});
