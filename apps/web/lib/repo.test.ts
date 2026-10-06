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
  it("keeps private stay details out of public guides and only reveals them via a valid stay link", async () => {
    const [p] = await repo.listProperties(a.id);
    const data = repo.propertyDataSchema.parse({ ...p, wifiPassword: "Secret-Wifi", wifiPrivate: true, privateNotes: "Door code 4821" });
    await repo.updateProperty(a.id, p.id, data);
    const pub = (await repo.getPublishedProperty(p.slug))!.property;
    expect(pub.privateNotes).toBeUndefined();
    expect(pub.wifiPassword).toBe("");
    expect(JSON.stringify(pub)).not.toContain("4821");
    // Hosts can only create/list/delete stays on their own properties.
    expect(await repo.createStay(b.id, p.id, { guestName: "X", checkIn: "2026-10-10", checkOut: "2026-10-12" })).toBeNull();
    const stay = (await repo.createStay(a.id, p.id, { guestName: "Maria", checkIn: "2026-10-10", checkOut: "2026-10-12" }))!;
    expect(stay.token.length).toBeGreaterThanOrEqual(24);
    expect(await repo.listStays(b.id, p.id)).toEqual([]);
    expect((await repo.listStays(a.id, p.id)).map((s) => s.guestName)).toEqual(["Maria"]);
    // Window: from the day before check-in until the end of the day after checkout.
    const at = (iso: string) => repo.getStayAccess(p.slug, stay.token, new Date(iso));
    expect((await at("2026-10-08T23:00:00Z")).status).toBe("upcoming");
    const active = await at("2026-10-09T08:00:00Z");
    expect(active).toMatchObject({ status: "active", privateNotes: "Door code 4821", wifiPassword: "Secret-Wifi", guestName: "Maria" });
    expect((await at("2026-10-13T23:59:00Z")).status).toBe("active");
    const ended = await at("2026-10-14T00:00:00Z");
    expect(ended.status).toBe("ended");
    expect(JSON.stringify(ended)).not.toContain("4821");
    expect((await repo.getStayAccess("wrong-slug", stay.token, new Date("2026-10-10T12:00:00Z"))).status).toBe("invalid");
    expect((await repo.getStayAccess(p.slug, "x".repeat(24), new Date("2026-10-10T12:00:00Z"))).status).toBe("invalid");
    expect(await repo.deleteStay(b.id, stay.id)).toBe(false);
    expect(await repo.deleteStay(a.id, stay.id)).toBe(true);
    expect((await at("2026-10-10T12:00:00Z")).status).toBe("invalid");
  });
  it("deletes the account and all data", async () => {
    await repo.deleteUser(a.id);
    expect(await repo.listProperties(a.id)).toEqual([]);
  });
});
