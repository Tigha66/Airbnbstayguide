import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setQueryOverride, splitStatements } from "./db";
import { upsertUser, setStripeCustomer, getBilling, type User } from "./repo";
import { POST as checkout } from "../app/api/v1/billing/checkout/route";
import { POST as webhook } from "../app/api/stripe/webhook/route";
import { planFromSubscription } from "./stripe";

const mocks = vi.hoisted(() => ({ host: vi.fn(), customer: vi.fn(), subscriptions: { list: vi.fn(), retrieve: vi.fn() }, sessions: { list: vi.fn(), create: vi.fn() }, construct: vi.fn() }));
vi.mock("./session", () => ({ requireHost: mocks.host }));
vi.mock("./billing", () => ({ ensureCustomer: mocks.customer }));
vi.mock("./stripe", async importOriginal => ({ ...await importOriginal<typeof import("./stripe")>(),
  priceId: vi.fn(async () => "price_manager_fixture"),
  stripeClient: () => ({ subscriptions: mocks.subscriptions, checkout: { sessions: mocks.sessions }, webhooks: { constructEvent: mocks.construct } }),
}));
let pg: PGlite; let host: User;
const secret = "whsec_local_acceptance_fixture";
const sdk = new Stripe("sk_test_fixture");
const managerSub = (status = "active") => ({
  id: "sub_manager_fixture", object: "subscription", customer: "cus_manager_fixture", status,
  metadata: { app: "stayguide" }, latest_invoice: { id: "in_fixture", status: "paid" }, items: { data: [{ quantity: 1, price: { id: "price_manager_fixture", lookup_key: "stayguide_manager_monthly_usd", currency: "usd", unit_amount: 19900, recurring: { interval: "month", interval_count: 1 } } }] },
}) as unknown as Stripe.Subscription;
const request = (data: object) => new Request("https://example.test/api/v1/billing/checkout", { method: "POST", headers: { origin: "https://example.test", "Content-Type": "application/json" }, body: JSON.stringify(data) });
async function event(type: string, object: unknown, created: number, id = `evt_${type}_${created}`) {
  const payload = JSON.stringify({ id, type, created, livemode: false, data: { object } });
  return webhook(new Request("https://example.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": sdk.webhooks.generateTestHeaderString({ payload, secret }) }, body: payload }));
}
beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
  vi.stubEnv("STAYGUIDE_MANAGER_CHECKOUT_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
  pg = new PGlite();
  for (const s of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(s);
  setQueryOverride(async (text, params) => (await pg.query(text, params)).rows as Record<string, unknown>[]);
  host = await upsertUser("manager-billing@test.invalid");
  await setStripeCustomer(host.id, "cus_manager_fixture");
  mocks.host.mockResolvedValue({ user: { ...host, emailVerified: true } }); mocks.customer.mockResolvedValue("cus_manager_fixture");
  mocks.subscriptions.list.mockResolvedValue({ data: [] }); mocks.sessions.list.mockResolvedValue({ data: [] });
  mocks.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/test-fixture" });
  mocks.subscriptions.retrieve.mockResolvedValue(managerSub());
  mocks.construct.mockImplementation((payload: string, signature: string, signingSecret: string) => sdk.webhooks.constructEvent(payload, signature, signingSecret));
});
afterEach(async () => { setQueryOverride(null); await pg.close(); vi.unstubAllEnvs(); });
describe("Manager billing acceptance with signed fixture events and isolated Postgres", () => {
  it("creates flat quantity-one checkout and never grants access from the success redirect", async () => {
    expect((await checkout(request({ plan: "manager", yearly: false }))).status).toBe(200);
    expect(mocks.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ mode: "subscription", line_items: [{ price: "price_manager_fixture", quantity: 1 }] }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
    expect((await getBilling(host.id))?.plan).toBe("free");
  });
  it("rejects unverified/duplicate subscriptions and closes checkout before creating a customer", async () => {
    vi.stubEnv("STAYGUIDE_MANAGER_CHECKOUT_ENABLED", "false");
    expect((await checkout(request({ plan: "manager" }))).status).toBe(503); expect(mocks.customer).not.toHaveBeenCalled();
    vi.stubEnv("STAYGUIDE_MANAGER_CHECKOUT_ENABLED", "true"); mocks.subscriptions.list.mockResolvedValue({ data: [managerSub()] });
    expect((await checkout(request({ plan: "manager" }))).status).toBe(409); expect(mocks.sessions.create).not.toHaveBeenCalled();
    mocks.host.mockResolvedValue({ user: { ...host, emailVerified: false } });
    expect((await checkout(request({ plan: "manager" }))).status).toBe(403);
  });
  it("grants Manager after a signed event and handles duplicates, renewals, failure, recovery and cancellation", async () => {
    const base = Math.floor(Date.now() / 1000);
    expect((await event("customer.subscription.created", managerSub(), base)).status).toBe(200);
    expect((await getBilling(host.id))?.plan).toBe("manager");
    const duplicate = await event("customer.subscription.created", managerSub(), base); expect((await duplicate.json()).result).toBe("duplicate");
    const invoice = { parent: { subscription_details: { subscription: "sub_manager_fixture" } } };
    await event("invoice.paid", invoice, base + 1); expect((await getBilling(host.id))?.plan).toBe("manager");
    mocks.subscriptions.retrieve.mockResolvedValue(managerSub("past_due"));
    await event("invoice.payment_failed", invoice, base + 2); expect((await getBilling(host.id))?.plan).toBe("free");
    mocks.subscriptions.retrieve.mockResolvedValue(managerSub());
    await event("invoice.paid", invoice, base + 3); expect((await getBilling(host.id))?.plan).toBe("manager");
    await event("customer.subscription.deleted", managerSub("canceled"), base + 4); expect((await getBilling(host.id))?.plan).toBe("free");
    expect((await getBilling(host.id))?.stripeSubscriptionId).toBeNull();
  });
  it("rejects signature tampering, stale events and cross-customer metadata", async () => {
    expect((await webhook(new Request("https://example.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "bad" }, body: "{}" }))).status).toBe(400);
    const base = Math.floor(Date.now() / 1000);
    await event("customer.subscription.deleted", managerSub("canceled"), base + 2);
    await event("customer.subscription.created", managerSub(), base + 1);
    expect((await getBilling(host.id))?.plan).toBe("free");
    const foreign = { ...managerSub(), customer: "cus_other", metadata: { app: "stayguide", user_id: host.id } };
    mocks.subscriptions.retrieve.mockResolvedValue(foreign);
    await event("customer.subscription.created", foreign, base + 3); expect((await getBilling(host.id))?.plan).toBe("free");
  });
  it("does not grant access for active subscriptions whose latest invoice is still unpaid", async () => {
    const pending = { ...managerSub(), latest_invoice: { id: "in_pending", status: "open" } };
    mocks.subscriptions.retrieve.mockResolvedValue(pending);
    await event("customer.subscription.created", pending, Math.floor(Date.now() / 1000));
    expect((await getBilling(host.id))?.plan).toBe("free");
    const r = await event("checkout.session.completed", { metadata: { app: "stayguide" }, mode: "subscription", subscription: "sub_manager_fixture", payment_status: "unpaid" }, Math.floor(Date.now() / 1000) + 1);
    expect((await r.json()).result).toBe("payment-pending");
    expect((await getBilling(host.id))?.plan).toBe("free");
  });
  it("refuses malformed Manager prices or quantities even with a matching lookup key", () => {
    for (const bad of [0, 2, 50]) { const sub = managerSub(); sub.items.data[0].quantity = bad; expect(planFromSubscription(sub)).toBe("free"); }
    for (const patch of [{ currency: "eur" }, { unit_amount: 1 }, { recurring: { interval: "week", interval_count: 1 } }]) {
      const sub = managerSub(); Object.assign(sub.items.data[0].price, patch); expect(planFromSubscription(sub)).toBe("free");
    }
  });
});
