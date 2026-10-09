import { beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { setQueryOverride, splitStatements } from "./db";
import * as repo from "./repo";
import { billableQuantity, extraCheckoutParams, lookupKey, planFromSubscription } from "./stripe";
import { handleStripeEvent } from "./stripe-events";
import { parseJson } from "./api";

const sub = (status: string, lookup: string | null) =>
  ({ status, items: { data: [{ price: { lookup_key: lookup } }] } }) as unknown as Stripe.Subscription;

describe("webhook trust boundary", () => {
  const stripe = new Stripe("sk_test_placeholder");
  it("verifies signatures and rejects tampering", () => {
    const payload = JSON.stringify({ id: "evt_test", object: "event", type: "ping", data: { object: {} } });
    const secret = "whsec_test";
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_test");
    expect(() => stripe.webhooks.constructEvent(payload + " ", header, secret)).toThrow();
  });
  it("ignores events from other products on the same Stripe account", async () => {
    expect(await handleStripeEvent({ type: "invoice.created", data: { object: {} } } as Stripe.Event)).toBe("ignored");
    expect(
      await handleStripeEvent({
        type: "checkout.session.completed",
        data: { object: { metadata: { app: "callpilot" } } },
      } as unknown as Stripe.Event),
    ).toBe("ignored");
    expect(
      await handleStripeEvent({
        type: "customer.subscription.updated",
        data: { object: { metadata: {}, customer: "cus_x", status: "active", items: { data: [{ price: { lookup_key: "other_plan" } }] } } },
      } as unknown as Stripe.Event),
    ).toBe("ignored");
  });
  it("caps request size", () => expect(() => parseJson(JSON.stringify({ data: "x".repeat(25000) }))).toThrow());
});

describe("plans", () => {
  it("derives the plan from the Stripe price, not from client input", () => {
    expect(planFromSubscription(sub("active", "stayguide_pro_yearly"))).toBe("pro");
    expect(planFromSubscription(sub("trialing", "stayguide_starter_monthly"))).toBe("starter");
    expect(planFromSubscription(sub("past_due", "stayguide_starter_monthly"))).toBe("starter");
    expect(planFromSubscription(sub("canceled", "stayguide_pro_monthly"))).toBe("free");
    expect(planFromSubscription(sub("unpaid", "stayguide_pro_monthly"))).toBe("free");
    expect(planFromSubscription(sub("active", "someone_else_pro"))).toBe("free");
  });
  it("recognises current-currency prices and the original un-suffixed ones", () => {
    expect(lookupKey("starter", false)).toBe("stayguide_starter_monthly");
    expect(lookupKey("pro", true)).toBe("stayguide_pro_yearly");
    expect(planFromSubscription(sub("active", "stayguide_starter_monthly_usd"))).toBe("starter");
    expect(planFromSubscription(sub("active", "stayguide_pro_yearly_usd"))).toBe("pro");
    expect(planFromSubscription(sub("active", "stayguide_pro_yearly_gbp_extra"))).toBe("free");
  });
  it("bills at least one and at most 100 properties", () => {
    expect(billableQuantity(0)).toBe(1);
    expect(billableQuantity(7)).toBe(7);
    expect(billableQuantity(500)).toBe(100);
  });
});

describe("extras checkout", () => {
  const base = { requestId: "r1", propertyId: "p1", slug: "sea", destination: "acct_host", origin: "https://x.test" };
  it("sends money to the host minus a 5% platform fee", () => {
    const params = extraCheckoutParams({ ...base, extra: { name: "Late checkout", description: "", price: 3000, approval: false } });
    expect(params.line_items?.[0]?.price_data?.currency).toBe("usd");
    expect(params.payment_intent_data?.application_fee_amount).toBe(150);
    expect(params.payment_intent_data?.transfer_data?.destination).toBe("acct_host");
    expect(params.payment_intent_data?.capture_method).toBe("automatic");
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(3000);
    expect(params.success_url).toBe("https://x.test/g/sea?extra=success");
  });
  it("only authorises the card when the host must approve first", () => {
    const params = extraCheckoutParams({ ...base, extra: { name: "Early check-in", description: "", price: 2500, approval: true } });
    expect(params.payment_intent_data?.capture_method).toBe("manual");
  });
});

describe("billing persistence (PGlite)", () => {
  let host: repo.User;
  beforeAll(async () => {
    const pg = new PGlite();
    setQueryOverride(async (text, params) => (await pg.query(text, params as unknown[])).rows as Record<string, unknown>[]);
    for (const s of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(s);
    host = await repo.upsertUser("billing@example.com", "Bill");
  });
  it("starts new hosts on the free plan", async () => {
    expect(host.plan).toBe("free");
    expect((await repo.getBilling(host.id))?.propertyCount).toBe(0);
  });
  it("applies subscription changes from webhooks", async () => {
    await repo.setStripeCustomer(host.id, "cus_1");
    expect(await repo.applySubscription({ customerId: "cus_1", subscriptionId: "sub_1", status: "active", plan: "pro" })).toBe(true);
    expect((await repo.getBilling(host.id))?.plan).toBe("pro");
    await repo.applySubscription({ customerId: "cus_1", subscriptionId: null, status: "canceled", plan: "free" });
    const after = await repo.getBilling(host.id);
    expect(after?.plan).toBe("free");
    expect(after?.stripeSubscriptionId).toBeNull();
    expect(await repo.applySubscription({ customerId: "cus_unknown", subscriptionId: "sub_x", status: "active", plan: "pro" })).toBe(false);
  });
  it("tracks paid extras from checkout to capture and hides abandoned checkouts", async () => {
    const p = await repo.createProperty(host, { name: "Loft", location: "Here", description: "" });
    const paid = await repo.createExtraRequest(p.id, { id: "late", name: "Late", price: 3000 }, { name: "Gia", contact: "g@x.io", note: "" }, "awaiting_payment");
    const abandoned = await repo.createExtraRequest(p.id, { id: "late", name: "Late", price: 3000 }, { name: "Max", contact: "m@x.io", note: "" }, "awaiting_payment");
    await repo.attachExtraCheckout(paid, "cs_1");
    await repo.attachExtraCheckout(abandoned, "cs_2");
    expect((await repo.listExtraRequests(host.id)).length).toBe(0);
    expect(await repo.settleExtraCheckout("cs_1", "pending", "pi_1")).toBe(true);
    expect(await repo.settleExtraCheckout("cs_1", "paid", "pi_1")).toBe(false); // only settles once
    await repo.settleExtraCheckout("cs_2", "expired", null);
    const list = await repo.listExtraRequests(host.id);
    expect(list.map((r) => [r.id, r.status, r.prepaid])).toEqual([[paid, "pending", true]]);
    expect((await repo.getOwnedExtraRequest(host.id, paid))?.payment_intent_id).toBe("pi_1");
  });
});

describe("webhook idempotency", () => {
  it("processes each Stripe event id once, and again only after a failed attempt is released", async () => {
    expect(await repo.claimStripeEvent("evt_dup", "invoice.upcoming")).toBe(true);
    expect(await repo.claimStripeEvent("evt_dup", "invoice.upcoming")).toBe(false);
    await repo.releaseStripeEvent("evt_dup");
    expect(await repo.claimStripeEvent("evt_dup", "invoice.upcoming")).toBe(true);
  });
});

describe("optional price-id overrides", () => {
  it("maps an override price to its plan, and lookup keys still work", async () => {
    const { planFromSubscription: planOf, priceOverride } = await import("./stripe");
    process.env.STRIPE_PRICE_PRO_YEARLY = "price_pro_y";
    try {
      expect(priceOverride("pro", true)).toBe("price_pro_y");
      expect(planOf({ status: "active", items: { data: [{ price: { id: "price_pro_y", lookup_key: null } }] } } as unknown as Stripe.Subscription)).toBe("pro");
      expect(planOf({ status: "active", items: { data: [{ price: { id: "price_other", lookup_key: "stayguide_starter_monthly_usd" } }] } } as unknown as Stripe.Subscription)).toBe("starter");
    } finally {
      delete process.env.STRIPE_PRICE_PRO_YEARLY;
    }
  });
});
