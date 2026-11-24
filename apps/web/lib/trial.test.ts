import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { applySubscription, aiMessageLimit, consumeAiUsage, createProperty, deleteUser, getBilling, getPublishedProperty, getUser, LimitError, listProperties, updateProperty, upsertUser } from "./repo";
import { plans } from "@stayguide/shared";
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
  setQueryOverride(async (text, params) => (await pg.query(text.replace(/\\bnow\\(\\)/g, `'${serverTime}'::timestamptz`), params)).rows as Record<string, unknown>[]);
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
  it("keeps a paid Founding Five customer on Free without a Pro AI trial", async () => {
    const owner = await fixture("founding-five-paid@example.test");
    const property = await createProperty(owner, { name: "Purchased guide", location: "Sampletown", description: "" });
    await updateProperty(owner.id, property.id, { ...property, status: "published" });
    await query(
      "INSERT INTO commissioned_guide_orders (property_id,owner_id,checkout_session_id,agreement_version,agreement_accepted_at,status) VALUES ($1,$2,'cs_found_five_trial_suppression','qa-v1',now(),'paid')",
      [property.id, owner.id],
    );
    expect(await getUser(owner.id)).toMatchObject({ plan: "free", trialActive: false, trialEndsAt: null });
    expect(await getBilling(owner.id)).toMatchObject({ plan: "free", trialActive: false, trialEndsAt: null, stripeCustomerId: null, stripeSubscriptionId: null });
    expect(await consumeAiUsage(owner.id)).toBe(false);
    expect((await getPublishedProperty(property.slug))?.ownerId).toBe(owner.id);
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
  it("keeps a published Free-plan guide accessible after trial expiry for over a year when the host and guide remain active", async () => {
    const owner = await fixture("founding-five-host@example.test");
    const other = await fixture("unrelated-host@example.test");
    const draft = await createProperty(owner, { name: "Commissioned guest guide", location: "London", description: "" });
    await updateProperty(owner.id, draft.id, { ...draft, status: "published" });
    expect((await getPublishedProperty(draft.slug))?.ownerId).toBe(owner.id);
    serverTime = "2027-11-06T00:00:00Z"; // Past 12 months from this test account's signup.
    try {
      expect(await getUser(owner.id)).toMatchObject({ plan: "free", trialActive: false });
      const billing = await getBilling(owner.id);
      expect(billing?.stripeSubscriptionId).toBeNull();
      expect(billing?.stripeCustomerId).toBeNull();
      expect((await getPublishedProperty(draft.slug))?.property.id).toBe(draft.id);
      expect(await listProperties(other.id)).toHaveLength(0);
      // Hosting eligibility must not silently grant a Pro AI quota or paid subscription.
      expect(aiMessageLimit("free", 1)).toBe(plans.free.messages);
      expect(aiMessageLimit("free", 1)).toBeLessThan(plans.pro.messages);
    } finally {
      serverTime = "2026-11-06T00:00:00Z";
    }
  });

  it("does not promise hosting after host unpublishes the guide or deletes the account", async () => {
    const owner = await fixture("hosting-withdrawal@example.test");
    const draft = await createProperty(owner, { name: "Withdrawable guide", location: "London", description: "" });
    await updateProperty(owner.id, draft.id, { ...draft, status: "published" });
    expect(await getPublishedProperty(draft.slug)).not.toBeNull();
    await updateProperty(owner.id, draft.id, { ...draft, status: "draft" });
    expect(await getPublishedProperty(draft.slug)).toBeNull();
    await updateProperty(owner.id, draft.id, { ...draft, status: "published" });
    await deleteUser(owner.id); // Account deletion cascades to the property.
    expect(await getPublishedProperty(draft.slug)).toBeNull();
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
