import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import * as repo from "./repo";

let a: repo.User;
let b: repo.User;
beforeAll(async () => {
  const pg = new PGlite();
  setQueryOverride(async (text, params) => (await pg.query(text, params as unknown[])).rows as Record<string, unknown>[]);
  for (const s of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(s);
  a = await repo.upsertUser("Host@Example.com", "Ana Host");
  b = await repo.upsertUser("other@example.com", "Ben");
});

describe("repository (Neon schema on PGlite)", () => {
  it("upserts users idempotently", async () => {
    const again = await repo.upsertUser("host@example.com", null);
    expect(again.id).toBe(a.id);
    expect(again.name).toBe("Ana Host");
  });
  it("creates, lists, updates and isolates properties per owner", async () => {
    const p = await repo.createProperty(a, { name: "Sea Breeze Loft", location: "Barcelona, Spain", description: 'WI-FI: Network "Sea", password "Pw123"\nPARKING: Street only.' });
    expect(p.wifiPassword).toBe("Pw123");
    expect(p.sections.map((s) => s.type)).toEqual(["wifi", "parking"]);
    expect((await repo.listProperties(a.id)).length).toBe(1);
    expect(await repo.listProperties(b.id)).toEqual([]);
    const data = repo.propertyDataSchema.parse({ ...p, name: "Sea Breeze Loft 2" });
    expect(await repo.updateProperty(b.id, p.id, data)).toBeNull();
    expect((await repo.updateProperty(a.id, p.id, data))?.name).toBe("Sea Breeze Loft 2");
    expect((await repo.getPublishedProperty(p.slug))?.property.name).toBe("Sea Breeze Loft 2");
    expect(await repo.deleteProperty(b.id, p.id)).toBe(false);
  });
  it("enforces plan property limits", async () => {
    const free = { ...b, plan: "free" as const };
    await repo.createProperty(free, { name: "One", location: "Lisbon", description: "" });
    await expect(repo.createProperty(free, { name: "Two", location: "Lisbon", description: "" })).rejects.toBeInstanceOf(repo.LimitError);
  });
  it("rate limits within a window", async () => {
    expect(await repo.consumeRateLimit("t", 2, 60)).toBe(true);
    expect(await repo.consumeRateLimit("t", 2, 60)).toBe(true);
    expect(await repo.consumeRateLimit("t", 2, 60)).toBe(false);
  });
  it("stores chats, shows escalations in the owner inbox and accepts host replies", async () => {
    const [p] = await repo.listProperties(a.id);
    const thread = crypto.randomUUID();
    await repo.saveMessages(p.id, thread, [
      { role: "guest", content: "Can we bring a dog?", language: "en" },
      { role: "assistant", content: "I don't know", language: "en", escalated: true },
    ]);
    const inbox = await repo.inbox(a.id);
    expect(inbox[0].escalated).toBe(true);
    expect(await repo.inbox(b.id)).toEqual([]);
    expect(await repo.hostReply(b.id, thread, "hijack")).toBe(false);
    expect(await repo.hostReply(a.id, thread, "Yes, small dogs are welcome")).toBe(true);
    const messages = await repo.threadMessages(p.id, thread);
    expect(messages.map((m) => m.role)).toEqual(["guest", "assistant", "host"]);
    expect(await repo.threadBelongsTo(thread, "another-property")).toBe(false);
  });
  it("stores the street address given at creation", async () => {
    const c = await repo.upsertUser("cabin@example.com", "Cabin Host");
    const p = await repo.createProperty(c, { name: "Smoky Ridge Cabin", location: "Gatlinburg, TN", address: " 123 Ridge Road ", description: "" });
    expect(p.address).toBe("123 Ridge Road");
    expect((await repo.getOwnedProperty(c.id, p.id))?.address).toBe("123 Ridge Road");
    await repo.deleteUser(c.id);
  });
  it("handles extra requests and analytics", async () => {
    const [p] = await repo.listProperties(a.id);
    const id = await repo.createExtraRequest(p.id, { id: "late", name: "Late checkout", price: 3000 }, { name: "Guest", contact: "g@x.com", note: "" });
    expect(await repo.setExtraRequestStatus(b.id, id, "approved")).toBe(false);
    expect(await repo.setExtraRequestStatus(a.id, id, "approved")).toBe(true);
    await repo.recordView(p.id);
    expect(await repo.consumeAiUsage(a.id)).toBe(true);
    const stats = await repo.analytics(a.id);
    expect(stats).toMatchObject({ views: 1, questions: 1, resolutionRate: 0, extrasRevenue: 3000, extraRequests: 1, aiMessagesThisMonth: 1 });
  });
  it("gives each plan its AI messages per property", () => {
    expect(repo.aiMessageLimit("free", 0)).toBe(25);
    expect(repo.aiMessageLimit("free", 1)).toBe(25);
    expect(repo.aiMessageLimit("starter", 7)).toBe(2100);
    expect(repo.aiMessageLimit("pro", 3)).toBe(4500);
  });
  it("stops AI answers once the monthly allowance is used", async () => {
    // b is on Free: 25 messages per property, at least one property counted.
    for (let i = 0; i < 25; i++) expect(await repo.consumeAiUsage(b.id)).toBe(true);
    expect(await repo.consumeAiUsage(b.id)).toBe(false);
  });
  it("lists every host for the owner overview", async () => {
    const hosts = await repo.adminHosts();
    const ana = hosts.find((h) => h.email === "host@example.com");
    expect(hosts).toHaveLength(2);
    expect(ana).toMatchObject({ plan: "free", properties: 1, published: 1, aiMessagesThisMonth: 1, aiMessageLimit: 25 });
    // The counter stops at the limit (it used to show 26/25).
    expect(hosts.find((h) => h.email === "other@example.com")).toMatchObject({ aiMessagesThisMonth: 25, aiMessageLimit: 25 });
  });
  it("lets the owner switch an account to the Hotel plan and keeps it across deploys", async () => {
    const h = await repo.upsertUser("hotel@example.com", "Grand Hotel");
    expect(await repo.setManagedPlan("HOTEL@example.com", "hotel")).toBe(true);
    expect((await repo.getUser(h.id))?.plan).toBe("hotel");
    expect(repo.aiMessageLimit("hotel", 40)).toBe(60000);
    // The schema migration that runs on every deploy must not reset it.
    const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
    for (const st of splitStatements(schema).filter((x) => x.startsWith("UPDATE users"))) await (await import("./db")).query(st);
    expect((await repo.getUser(h.id))?.plan).toBe("hotel");
    // Hotel accounts can have many properties.
    for (let i = 0; i < 3; i++) await repo.createProperty({ ...h, plan: "hotel" }, { name: `Room ${i + 1}`, location: "Lisbon", description: "" });
    expect((await repo.listProperties(h.id)).length).toBe(3);
    expect(await repo.setManagedPlan("hotel@example.com", "free")).toBe(true);
    expect((await repo.getUser(h.id))?.plan).toBe("free");
    await repo.deleteUser(h.id);
  });
  it("won't override a plan controlled by an active Stripe subscription", async () => {
    const s = await repo.upsertUser("subscriber@example.com", "Sub");
    await repo.applySubscription({ customerId: "cus_sub", userId: s.id, subscriptionId: "sub_1", status: "active", plan: "starter" });
    expect(await repo.setManagedPlan("subscriber@example.com", "hotel")).toBe(false);
    expect((await repo.getUser(s.id))?.plan).toBe("starter");
    expect(await repo.setManagedPlan("nobody@example.com", "hotel")).toBe(false);
    await repo.deleteUser(s.id);
  });
  it("deletes the account and all data", async () => {
    await repo.deleteUser(a.id);
    expect(await repo.listProperties(a.id)).toEqual([]);
  });
});

describe("plan limits and AI allowance under load", () => {
  it("lets only one of several simultaneous creates through on a 1-property plan", async () => {
    const c = { ...(await repo.upsertUser("race@example.com", "Racer")), plan: "free" as const };
    const results = await Promise.allSettled(
      ["A", "B", "C", "D"].map((n) => repo.createProperty(c, { name: `Race ${n}`, location: "Lisbon", description: "" })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof repo.LimitError)).toBe(true);
    expect(await repo.listProperties(c.id)).toHaveLength(1);
    expect(await repo.propertyLimitReached(c)).toBe(true);
  });
  it("can add again after deleting, without slot clashes", async () => {
    const d = { ...(await repo.upsertUser("slots@example.com", "Slots")), plan: "starter" as const };
    const one = await repo.createProperty(d, { name: "Slot One", location: "Lisbon", description: "" });
    await repo.createProperty(d, { name: "Slot Two", location: "Lisbon", description: "" });
    await repo.deleteProperty(d.id, one.id);
    await expect(repo.createProperty(d, { name: "Slot Three", location: "Lisbon", description: "" })).resolves.toBeTruthy();
    expect(await repo.listProperties(d.id)).toHaveLength(2);
  });
  it("gives back an AI message when the AI call failed", async () => {
    const e = await repo.upsertUser("refund@example.com", "Refund");
    await repo.consumeAiUsage(e.id);
    await repo.consumeAiUsage(e.id);
    await repo.refundAiUsage(e.id);
    const [row] = await query<{ messages: number }>(`SELECT messages FROM usage_counters WHERE owner_id = $1`, [e.id]);
    expect(Number(row.messages)).toBe(1);
  });
});

describe("AI allowance never passes its limit", () => {
  it("bases the allowance on at most the plan's property count", () => {
    expect(repo.aiMessageLimit("free", 0)).toBe(25);
    expect(repo.aiMessageLimit("free", 5)).toBe(25); // free plan covers 1 property
    expect(repo.aiMessageLimit("starter", 3)).toBe(900);
    expect(repo.aiMessageLimit("starter", 50)).toBe(300 * 20);
  });
  it("reserves atomically and stops exactly at the limit", async () => {
    const u = await repo.upsertUser("allowance@example.com", "Allowance");
    expect(await repo.reserveAiUsage(u.id, 20)).toBe(true);
    expect(await repo.reserveAiUsage(u.id, 10)).toBe(false); // 30 > 25: refused, counter unchanged
    const results = await Promise.all(Array.from({ length: 8 }, () => repo.consumeAiUsage(u.id)));
    expect(results.filter(Boolean)).toHaveLength(5);
    const [row] = await query<{ messages: number }>(`SELECT messages FROM usage_counters WHERE owner_id = $1`, [u.id]);
    expect(Number(row.messages)).toBe(25);
    await repo.refundAiUsage(u.id, 3);
    expect(await repo.reserveAiUsage(u.id, 3)).toBe(true);
  });
  it("runs a cooldown for its duration", async () => {
    expect(await repo.inCooldown("test-provider")).toBe(false);
    await repo.startCooldown("test-provider", 300);
    expect(await repo.inCooldown("test-provider")).toBe(true);
    await repo.startCooldown("test-provider", 0);
    expect(await repo.inCooldown("test-provider")).toBe(false);
  });
});

describe("inbox and account clean-up", () => {
  it("shows 'Needs your help' only while an escalation is newer than the host's last reply", async () => {
    const h = await repo.upsertUser("inbox@example.com", "Inbox");
    const p = await repo.createProperty({ ...h, plan: "starter" }, { name: "Inbox Villa", location: "Lisbon", description: "" });
    const thread = crypto.randomUUID();
    await repo.saveMessages(p.id, thread, [
      { role: "guest", content: "Can I bring a dog?", language: "en" },
      { role: "assistant", content: "I've passed this to your host.", language: "en", escalated: true },
    ]);
    const find = async () => (await repo.inbox(h.id)).find((t) => t.threadId === thread)!;
    expect((await find()).escalated).toBe(true);
    await repo.hostReply(h.id, thread, "Yes, small dogs are welcome.");
    expect((await find()).escalated).toBe(false);
    await repo.saveMessages(p.id, thread, [
      { role: "guest", content: "Is there a pool?", language: "en" },
      { role: "assistant", content: "I've passed this to your host.", language: "en", escalated: true },
    ]);
    expect((await find()).escalated).toBe(true);
  });
  it("deletes the account's guide translations too", async () => {
    const h = await repo.upsertUser("translations@example.com", "Trans");
    const p = await repo.createProperty({ ...h, plan: "free" }, { name: "Trans House", location: "Lisbon", description: "" });
    await repo.saveGuideTranslation(p.id, "fr", "hash", { description: "Bonjour", sections: [], extras: [] });
    await repo.deleteUser(h.id);
    const rows = await query(`SELECT 1 FROM guide_translations WHERE property_key = $1`, [p.id]);
    expect(rows).toHaveLength(0);
  });
});
