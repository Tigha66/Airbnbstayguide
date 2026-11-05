import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { applySubscription, consumeAiUsage, createProperty, getBilling, getUser, LimitError, listProperties, upsertUser } from "./repo";
import { TRIAL_DAYS } from "./trial";
const pg = new PGlite();
let serverTime = "2026-11-06T00:00:00Z";
async function fixture(email: string, options: { verified?: boolean; plan?: string; created?: string; subscription?: string } = {}) {
  const user = await upsertUser(email);
  await query(`UPDATE users SET created_at=$2::timestamptz, email_verified_at=CASE WHEN $3::boolean THEN $2::timestamptz ELSE NULL END, plan=$4, stripe_subscription_id=$5 WHERE id=$1`, [user.id, options.created ?? "2026-11-05T00:00:00Z", options.verified ?? true, options.plan ?? "free", options.subscription ?? null]);
  return (await getUser(user.id))!;
}
beforeAll(async () => {
  // Control only the DB clock in this isolated database; production uses Postgres now().
  setQueryOverride(async (text, params) => (await pg.query(text.replace(/\bnow\(\)/g, `'${serverTime}'::timestamptz`), params)).rows as Record<string, unknown>[]);
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(statement);
}, 30000);
afterAll(async () => { setQueryOverride(null); await pg.close(); });
describe("14-day no-card trial on existing account records", () => {
  it("activates verified new accounts without creating Stripe billing state", async () => {
    const user = await fixture("new-trial@example.test");
    expect(TRIAL_DAYS).toBe(14);
    expect(user).toMatchObject({ plan: "pro", trialActive: true });
    const billing = await getBilling(user.id);
    expect(billing).toMatchObject({ plan: "pro", trialActive: true, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null, trialEndsAt: "2026-11-19T00:00:00.000Z" });
    expect((await query("SELECT plan FROM users WHERE id=$1", [user.id]))[0].plan).toBe("free");
    expect((await getUser(user.id))?.trialEndsAt).toEqual(user.trialEndsAt);
  });
  it("requires email verification and does not give legacy accounts a new trial", async () => {
    expect(await fixture("unverified-trial@example.test", { verified: false })).toMatchObject({ plan: "free", trialActive: false });
    expect(await fixture("legacy-trial@example.test", { created: "2026-11-04T00:00:00Z" })).toMatchObject({ plan: "free", trialActive: false, trialEndsAt: null });
    expect(await fixture("future-trial@example.test", { created: "2026-11-07T00:00:00Z" })).toMatchObject({ plan: "free", trialActive: false });
  });
  it("keeps paid, complimentary and existing Stripe accounts unchanged", async () => {
    for (const plan of ["starter", "pro", "manager", "hotel"]) expect(await fixture(`paid-${plan}@example.test`, { plan })).toMatchObject({ plan, trialActive: false, trialEndsAt: null });
    expect(await fixture("existing-stripe@example.test", { subscription: "sub_existing" })).toMatchObject({ plan: "free", trialActive: false });
  });
  it("limits a trial to one saved property, including simultaneous creates", async () => {
    const user = await fixture("quota-trial@example.test");
    const results = await Promise.allSettled([
      createProperty(user, { name: "First guide", location: "Lisbon", description: "" }),
      createProperty(user, { name: "Second guide", location: "Lisbon", description: "" }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find(r => r.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(LimitError);
    expect(await listProperties(user.id)).toHaveLength(1);
  });
  it("enforces the Pro AI allowance then expires exactly at 14 days without losing the guide", async () => {
    const user = await fixture("expiry-trial@example.test");
    const guide = await createProperty(user, { name: "Keep my guide", location: "London", description: "" });
    await query("INSERT INTO usage_counters (owner_id, month, messages) VALUES ($1,$2,1499)", [user.id, new Date().toISOString().slice(0, 7)]);
    expect(await consumeAiUsage(user.id)).toBe(true);
    expect(await consumeAiUsage(user.id)).toBe(false);
    serverTime = "2026-11-18T23:59:59.999Z";
    expect((await getUser(user.id))?.trialActive).toBe(true);
    serverTime = "2026-11-19T00:00:00Z";
    expect(await getUser(user.id)).toMatchObject({ plan: "free", trialActive: false });
    expect((await getBilling(user.id))?.stripeCustomerId).toBeNull();
    expect((await listProperties(user.id))[0].id).toBe(guide.id);
    expect(await consumeAiUsage(user.id)).toBe(false);
    serverTime = "2026-11-06T00:00:00Z";
  });
  it("lets a Stripe subscription override the trial and never reactivates it after cancellation", async () => {
    const user = await fixture("upgrade-trial@example.test");
    await query("UPDATE users SET stripe_customer_id='cus_trial_upgrade' WHERE id=$1", [user.id]);
    await applySubscription({ customerId: "cus_trial_upgrade", subscriptionId: "sub_trial_upgrade", plan: "starter", status: "active", eventCreated: 1 });
    expect(await getUser(user.id)).toMatchObject({ plan: "starter", trialActive: false });
    await applySubscription({ customerId: "cus_trial_upgrade", subscriptionId: "sub_trial_upgrade", plan: "free", status: "canceled", eventCreated: 2 });
    expect(await getUser(user.id)).toMatchObject({ plan: "free", trialActive: false });
  });
});
