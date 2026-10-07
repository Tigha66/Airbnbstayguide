import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { setQueryOverride, splitStatements } from "./db";
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
    expect(hosts.find((h) => h.email === "other@example.com")).toMatchObject({ aiMessagesThisMonth: 26, aiMessageLimit: 25 });
  });
  it("deletes the account and all data", async () => {
    await repo.deleteUser(a.id);
    expect(await repo.listProperties(a.id)).toEqual([]);
  });
});
