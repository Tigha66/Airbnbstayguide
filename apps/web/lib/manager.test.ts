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
});
