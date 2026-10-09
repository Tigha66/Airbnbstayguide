import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import * as repo from "./repo";
import { cronAuthorized, runRetention } from "./retention";

let owner: repo.User;
let other: repo.User;
let propertyId: string;
beforeAll(async () => {
  const pg = new PGlite();
  setQueryOverride(async (text, params) => (await pg.query(text, params as unknown[])).rows as Record<string, unknown>[]);
  for (const s of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(s);
  owner = { ...(await repo.upsertUser("owner@example.com", "Olga")), plan: "pro" };
  other = await repo.upsertUser("someone@example.com", "Sam");
  propertyId = (await repo.createProperty(owner, { name: "Loft", location: "Porto", description: "" })).id;
  const thread = "00000000-0000-4000-8000-000000000001";
  await query(
    `INSERT INTO chat_messages (property_id, thread_id, role, content, created_at) VALUES
       ($1, $2, 'guest', 'old question', now() - interval '13 months'),
       ($1, $2, 'guest', 'recent question', now() - interval '2 months')`,
    [propertyId, thread],
  );
  await query(
    `INSERT INTO extra_requests (property_id, extra_id, extra_name, price, guest_name, guest_contact, note, status, created_at) VALUES
       ($1, 'x', 'Late checkout', 20, 'Old Guest', 'old@example.com', 'by noon', 'paid', now() - interval '7 months'),
       ($1, 'x', 'Late checkout', 20, 'New Guest', 'new@example.com', '', 'pending', now() - interval '1 month')`,
    [propertyId],
  );
});

describe("data retention", () => {
  it("deletes chats after 12 months and clears guest contact details after 6 months", async () => {
    expect(await runRetention()).toEqual({ chatMessagesDeleted: 1, extraRequestsAnonymised: 1, stripeEventsDeleted: 0 });
    const chats = await query<{ content: string }>(`SELECT content FROM chat_messages`);
    expect(chats.map((c) => c.content)).toEqual(["recent question"]);
    const extras = await query<{ guest_name: string; guest_contact: string; note: string; status: string }>(
      `SELECT guest_name, guest_contact, note, status FROM extra_requests ORDER BY created_at`,
    );
    expect(extras[0]).toEqual({ guest_name: "", guest_contact: "", note: "", status: "paid" });
    expect(extras[1].guest_contact).toBe("new@example.com");
    // Running again changes nothing.
    expect(await runRetention()).toEqual({ chatMessagesDeleted: 0, extraRequestsAnonymised: 0, stripeEventsDeleted: 0 });
  });
});

describe("data export", () => {
  it("exports only the host's own data", async () => {
    const data = await repo.exportUserData(owner.id);
    expect(data?.account).toMatchObject({ email: "owner@example.com", name: "Olga" });
    expect(data?.properties).toHaveLength(1);
    expect(data?.guestMessages.map((m) => m.content)).toEqual(["recent question"]);
    expect(data?.extraRequests).toHaveLength(2);
    const theirs = await repo.exportUserData(other.id);
    expect(theirs?.properties).toEqual([]);
    expect(theirs?.guestMessages).toEqual([]);
    expect(theirs?.extraRequests).toEqual([]);
    expect(await repo.exportUserData("00000000-0000-4000-8000-000000000999")).toBeNull();
  });
});

describe("cron authorisation", () => {
  const secret = "a-long-cron-secret-value";
  it("accepts only the exact bearer secret", () => {
    expect(cronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(cronAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(cronAuthorized(secret, secret)).toBe(false);
    expect(cronAuthorized(null, secret)).toBe(false);
  });
  it("refuses everything without a (long enough) secret", () => {
    expect(cronAuthorized("Bearer ", undefined)).toBe(false);
    expect(cronAuthorized("Bearer short", "short")).toBe(false);
  });
});
