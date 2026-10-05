import { describe, it, expect } from "vitest";
import Stripe from "stripe";
import { subscriptionRecord } from "./webhook";
import { parseJson } from "./api";
describe("webhook trust boundary", () => {
  const stripe = new Stripe("sk_test_placeholder");
  it("verifies signatures and rejects tampering", () => {
    const payload = JSON.stringify({
      id: "evt_test",
      object: "event",
      type: "ping",
      data: { object: {} },
    });
    const secret = "whsec_test";
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe(
      "evt_test",
    );
    expect(() =>
      stripe.webhooks.constructEvent(payload + " ", header, secret),
    ).toThrow();
  });
  it("ignores unrelated events", () => {
    expect(
      subscriptionRecord({ type: "invoice.created" } as Stripe.Event),
    ).toBe(null);
  });
  it("requires trusted subscription metadata", () => {
    expect(() =>
      subscriptionRecord({
        type: "customer.subscription.updated",
        data: { object: { metadata: {}, items: { data: [] } } },
      } as unknown as Stripe.Event),
    ).toThrow();
  });
  it("caps request size", () =>
    expect(() =>
      parseJson(JSON.stringify({ data: "x".repeat(25000) })),
    ).toThrow());
});
