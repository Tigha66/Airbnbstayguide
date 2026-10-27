import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import * as repo from "./repo";

const pg = new PGlite();
let owner: repo.User;
let stranger: repo.User;
let unverified: repo.User;
beforeAll(async () => {
  setQueryOverride(async (text, params) => (await pg.query(text, params)).rows as Record<string, unknown>[]);
  for (const sql of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(sql);
  owner = await repo.upsertUser("owner@example.test", "Owner");
  stranger = await repo.upsertUser("stranger@example.test", "Stranger");
  unverified = await repo.upsertUser("unverified@example.test", "Unverified");
  await query("UPDATE users SET email_verified_at = now() WHERE id = $1", [owner.id]);
  await repo.setStripeCustomer(owner.id, "cus_existing_pro");
  await repo.applySubscription({ customerId: "cus_existing_pro", subscriptionId: "sub_existing_pro", status: "active", plan: "pro" });
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => { setQueryOverride(null); await pg.close(); });

describe("complimentary Manager access", () => {
  it("requires an explicit grant and verified email without changing the Pro subscription", async () => {
    vi.stubEnv("MANAGER_ACCESS_EMAILS", "");
    expect(await repo.hasManagerAccess(owner.id)).toBe(false);
    vi.stubEnv("MANAGER_ACCESS_EMAILS", " OWNER@EXAMPLE.TEST , unverified@example.test ");
    expect(await repo.hasManagerAccess(owner.id)).toBe(true);
    expect(await repo.hasManagerAccess(stranger.id)).toBe(false);
    expect(await repo.hasManagerAccess(unverified.id)).toBe(false);
    expect(await repo.hasManagerAccess(crypto.randomUUID())).toBe(false);
    expect(await repo.getUser(owner.id)).toMatchObject({ plan: "pro" });
    const [billing] = await query("SELECT stripe_customer_id, stripe_subscription_id, subscription_status FROM users WHERE id=$1", [owner.id]);
    expect(billing).toEqual({ stripe_customer_id: "cus_existing_pro", stripe_subscription_id: "sub_existing_pro", subscription_status: "active" });
  });
  it("runs the full rule → guest message → triage → host reply → resolve flow and blocks another owner", async () => {
    vi.stubEnv("MANAGER_ACCESS_EMAILS", owner.email);
    const property = await repo.createProperty(owner, { name: "Private QA Cottage", location: "York", description: "Check out at 11 AM." });
    const rule = await repo.createPortfolioRule(owner.id, { keyword: "water leak", label: "Maintenance", priority: "urgent" });
    expect(rule?.enabled).toBe(false);
    await repo.setPortfolioRuleEnabled(owner.id, rule!.id, true);
    const template = await repo.createPortfolioReplyTemplate(owner.id, { title: "Maintenance", body: "I will arrange help." });
    const thread = crypto.randomUUID();
    await repo.saveMessages(property.id, thread, [{ role: "guest", content: "There is a WATER LEAK", language: "en" }]);
    expect(await repo.applyPortfolioRules(owner.id, property.id, thread, "There is a WATER LEAK")).toBe(true);
    expect((await repo.listPortfolioTriage(owner.id))[0]).toMatchObject({ threadId: thread, priority: "urgent", status: "open" });
    expect(await repo.hostReply(stranger.id, thread, "Unauthorised")).toBe(false);
    expect(await repo.hostReply(owner.id, thread, template!.body)).toBe(true);
    expect((await repo.threadMessages(property.id, thread)).at(-1)).toMatchObject({ role: "host", content: template!.body });
    await repo.setPortfolioTriageStatus(owner.id, thread, "resolved");
    expect((await repo.listPortfolioTriage(owner.id))[0].status).toBe("resolved");
    expect(await repo.listPortfolioRules(stranger.id)).toEqual([]);
    expect(await repo.listPortfolioTriage(stranger.id)).toEqual([]);
    expect(await repo.listPortfolioReplyTemplates(stranger.id)).toEqual([]);
    expect(await repo.deletePortfolioRule(stranger.id, rule!.id)).toBe(false);
    expect(await repo.deletePortfolioReplyTemplate(stranger.id, template!.id)).toBe(false);
    vi.stubEnv("MANAGER_ACCESS_EMAILS", "");
    expect(await repo.listPortfolioRules(owner.id)).toEqual([]);
    expect(await repo.listPortfolioTriage(owner.id)).toEqual([]);
    expect(await repo.listPortfolioReplyTemplates(owner.id)).toEqual([]);
    expect(await repo.setPortfolioRuleEnabled(owner.id, rule!.id, true)).toBe(false);
    expect(await repo.applyPortfolioRules(owner.id, property.id, thread, "water leak")).toBe(false);
    expect(await repo.updatePortfolioReplyTemplate(owner.id, template!.id, { title: "New", body: "New" })).toBeNull();
  });
  it("treats quote characters in configuration as literal data", async () => {
    vi.stubEnv("MANAGER_ACCESS_EMAILS", "owner@example.test'); UPDATE users SET plan='manager'; --");
    expect(await repo.hasManagerAccess(owner.id)).toBe(false);
    expect((await repo.getUser(owner.id))?.plan).toBe("pro");
  });
});
