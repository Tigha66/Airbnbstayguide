import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { createProperty, getBilling, getUser, upsertUser } from "./repo";
import { getCommissionedGuideHosting } from "./commissioned-hosting";

const pg = new PGlite();
let serverTime = "2026-12-01T12:00:00Z";

beforeAll(async () => {
  setQueryOverride(async (text, params) =>
    (await pg.query(text.replace(/\\bnow\\(\\)/g, `'${serverTime}'::timestamptz`), params)).rows as Record<string, unknown>[]);
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) {
    await pg.exec(statement);
  }
}, 30000);
afterAll(async () => { setQueryOverride(null); await pg.close(); });

describe("commissioned guide hosting (QA only; no payment grant endpoint)", () => {
  it("tracks one property's 12-month window without creating Stripe billing or a paid subscription", async () => {
    const owner = await upsertUser("founding-five@example.test");
    const stranger = await upsertUser("unrelated-five@example.test");
    const property = await createProperty(owner, { name: "Founding guide", location: "London", description: "" });
    await query(
      `INSERT INTO commissioned_guide_hosting
        (property_id, owner_id, payment_reference, agreement_version, starts_at, ends_at)
        VALUES ($1, $2, 'synthetic-payment-ref', 'draft-v1', '2026-12-01T00:00:00Z', '2027-12-01T00:00:00Z')`,
      [property.id, owner.id],
    );

    expect(await getCommissionedGuideHosting(stranger.id, property.id)).toBeNull();
    expect(await getCommissionedGuideHosting(owner.id, property.id)).toMatchObject({ withinTerm: true, status: "active" });
    expect(await getUser(owner.id)).toMatchObject({ plan: "free" });
    expect((await getBilling(owner.id))?.stripeSubscriptionId).toBeNull();

    serverTime = "2027-12-01T00:00:00Z";
    expect(await getCommissionedGuideHosting(owner.id, property.id)).toMatchObject({ withinTerm: false, status: "active" });
    await query("UPDATE commissioned_guide_hosting SET status='cancelled' WHERE property_id=$1", [property.id]);
    serverTime = "2027-11-01T00:00:00Z";
    expect(await getCommissionedGuideHosting(owner.id, property.id)).toMatchObject({ withinTerm: false, status: "cancelled" });
    serverTime = "2026-12-01T12:00:00Z";
  });

  it("refuses to associate someone else's property with a different owner", async () => {
    const owner = await upsertUser("commission-owner@example.test");
    const unrelated = await upsertUser("commission-unrelated@example.test");
    const property = await createProperty(owner, { name: "Owned property", location: "London", description: "" });
    await expect(query(
      `INSERT INTO commissioned_guide_hosting
        (property_id, owner_id, payment_reference, agreement_version, starts_at, ends_at)
        VALUES ($1, $2, 'synthetic-cross-owner', 'draft-v1', '2026-12-01T00:00:00Z', '2027-12-01T00:00:00Z')`,
      [property.id, unrelated.id],
    )).rejects.toThrow();
  });
});
