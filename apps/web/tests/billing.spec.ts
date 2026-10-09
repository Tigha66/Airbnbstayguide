import { test, expect } from "@playwright/test";
import Stripe from "stripe";

// Without Stripe keys (the browser-only demo) payments must fail closed and say "coming soon".
test.describe("billing without Stripe", () => {
  test.skip(Boolean(process.env.STRIPE_SECRET_KEY), "Stripe is configured on this server");

  test("payment endpoints answer 503 and nothing claims Stripe", async ({ page, request, baseURL }) => {
    const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
    for (const path of ["/api/v1/billing/checkout", "/api/v1/connect"]) {
      const res = await request.post(path, { data: { plan: "starter" }, headers: { origin } });
      // 503 (payments not configured), or 403 when the local server's own origin differs
      // (e.g. `next start --hostname 0.0.0.0`). Either way nothing can be bought.
      expect([403, 503]).toContain(res.status());
    }
    const me = await (await request.get("/api/v1/me")).json();
    expect(me.services.stripe).toBe(false);
    await page.goto("/dashboard/billing");
    await expect(page.getByText("Payments coming soon.", { exact: false })).toBeVisible();
    await expect(page.getByText("billed securely by Stripe")).toHaveCount(0);
  });
});

// With Stripe TEST-mode keys: the webhook verifies signatures and handles each event once.
test.describe("Stripe webhook (test mode)", () => {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  test.skip(!key.startsWith("sk_test_") || !secret, "needs STRIPE_SECRET_KEY=sk_test_… and STRIPE_WEBHOOK_SECRET");

  test("rejects unsigned events and ignores a duplicate delivery", async ({ request }) => {
    const stripe = new Stripe(key);
    const payload = JSON.stringify({ id: `evt_e2e_${Date.now()}`, object: "event", type: "invoice.created", data: { object: {} } });
    const unsigned = await request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json" } });
    expect(unsigned.status()).toBe(400);
    const headers = { "content-type": "application/json", "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret }) };
    const first = await (await request.post("/api/stripe/webhook", { data: payload, headers })).json();
    expect(first).toMatchObject({ received: true });
    const second = await (await request.post("/api/stripe/webhook", { data: payload, headers })).json();
    expect(second).toMatchObject({ received: true, duplicate: true });
  });
});
