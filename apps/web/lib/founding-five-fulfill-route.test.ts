import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { sendEmail } from "@/lib/mailer";

const fixture = vi.hoisted(() => ({
  ownerId: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  propertyId: "founding-five-fulfill-qa",
  sessionId: "cs_test_founding_five_qa",
  paymentId: "pi_test_founding_five_qa",
  priceId: "price_test_founding_five_qa",
  acceptedAt: "2026-11-22T12:00:00.000Z",
  publishedAt: "2026-11-23T12:00:00.000Z",
}));

vi.mock("@/lib/session", () => ({
  requireHost: async () => ({ user: { id: fixture.ownerId, email: "owner@example.test", emailVerified: true } }),
}));
vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn(async () => undefined) }));
vi.mock("@/lib/api", () => ({
  safeOrigin: () => true,
  parseJson: (raw: string) => JSON.parse(raw),
}));
vi.mock("@/lib/stripe", () => ({
  stripeConfigured: () => true,
  stripeLiveMode: () => false,
  assertStripeAccountIdentity: async () => ({ id: "acct_test_founding_five_qa", livemode: false }),
  stripeClient: () => ({
    checkout: { sessions: {
      retrieve: async () => ({
        id: fixture.sessionId, mode: "payment", status: "complete", payment_status: "paid",
        payment_intent: fixture.paymentId,
        metadata: {
          app: "stayguide", kind: "commissioned_hosting", qa_only: "true",
          user_id: fixture.ownerId, property_id: fixture.propertyId,
          agreement_version: "founding-five-qa-usd-v2", agreement_accepted_at: fixture.acceptedAt, price_id: fixture.priceId,
        },
      }),
      listLineItems: async () => ({
        data: [{ price: { id: fixture.priceId }, quantity: 1, amount_total: 4900, currency: "usd" }],
      }),
    } },
    paymentIntents: { retrieve: async () => ({
      status: "succeeded", livemode: false,
      metadata: { app: "stayguide", kind: "commissioned_hosting", qa_only: "true",
        user_id: fixture.ownerId, property_id: fixture.propertyId },
    }) },
    prices: { retrieve: async () => ({
      active: true, currency: "usd", unit_amount: 4900, recurring: null,
      product: "prod_test_founding_five_qa", metadata: { qa_only: "true" },
    }) },
    products: { retrieve: async () => ({
      metadata: { qa_only: "true", environment: "test_mode_only" },
    }) },
  }),
}));

import { POST } from "@/app/api/founding-five/fulfill/route";

const pg = new PGlite();
const oldEnv = {
  vercelEnv: process.env.VERCEL_ENV,
  enabled: process.env.FOUNDING_FIVE_QA_ENABLED,
  price: process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID,
  expectedAccount: process.env.STRIPE_EXPECTED_ACCOUNT_ID,
};

beforeAll(async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.FOUNDING_FIVE_QA_ENABLED = "true";
  process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID = fixture.priceId;
  process.env.STRIPE_EXPECTED_ACCOUNT_ID = "acct_test_founding_five_qa";
  setQueryOverride(async (sql, params) => (await pg.query(sql, params)).rows as Record<string, unknown>[]);
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")))
    await pg.exec(statement);
  await query("INSERT INTO users(id, email, plan) VALUES ($1,'owner@example.test','free')", [fixture.ownerId]);
  await query(
    "INSERT INTO properties(id,owner_id,slug,status,data,published_at) VALUES ($1,$2,'fulfill-qa','published','{}',$3)",
    [fixture.propertyId, fixture.ownerId, fixture.publishedAt],
  );
  await query(
    "INSERT INTO commissioned_guide_orders(property_id,owner_id,checkout_session_id,payment_reference,agreement_version,agreement_accepted_at,status) VALUES ($1,$2,$3,$4,'founding-five-qa-usd-v2',$5,'paid')",
    [fixture.propertyId, fixture.ownerId, fixture.sessionId, fixture.paymentId, fixture.acceptedAt],
  );
}, 30000);

afterAll(async () => {
  setQueryOverride(null);
  await pg.close();
  for (const [key, value] of [
    ["VERCEL_ENV", oldEnv.vercelEnv],
    ["FOUNDING_FIVE_QA_ENABLED", oldEnv.enabled],
    ["STRIPE_FOUNDING_FIVE_QA_PRICE_ID", oldEnv.price],
    ["STRIPE_EXPECTED_ACCOUNT_ID", oldEnv.expectedAccount],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function request() {
  return new Request("https://qa.example.test/api/founding-five/fulfill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: fixture.sessionId, locale: "en" }),
  });
}

it("activates exactly one 12-month hosting term after a verified paid test order, without premium entitlements", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    activated: true, idempotent: false, status: "active", confirmationEmailSent: true,
    startsAt: fixture.publishedAt, endsAt: "2027-11-23T12:00:00.000Z",
  });
  const [user] = await query<{ plan: string; stripe_subscription_id: string | null }>(
    "SELECT plan, stripe_subscription_id FROM users WHERE id=$1", [fixture.ownerId],
  );
  expect(user).toEqual({ plan: "free", stripe_subscription_id: null });
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

it("retries idempotently without extending the term or creating a second grant", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    activated: true, idempotent: true, status: "active", confirmationEmailSent: true,
    startsAt: fixture.publishedAt, endsAt: "2027-11-23T12:00:00.000Z",
  });
  const [count] = await query<{ n: number }>("SELECT count(*)::int AS n FROM commissioned_guide_hosting WHERE property_id=$1", [fixture.propertyId]);
  expect(count.n).toBe(1);
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

it("does not reactivate hosting after refund", async () => {
  await query("UPDATE commissioned_guide_orders SET status='refunded' WHERE property_id=$1", [fixture.propertyId]);
  await query("UPDATE commissioned_guide_hosting SET status='refunded' WHERE property_id=$1", [fixture.propertyId]);
  const response = await POST(request());
  expect(response.status).toBe(409);
  const [record] = await query<{ status: string }>("SELECT status FROM commissioned_guide_hosting WHERE property_id=$1", [fixture.propertyId]);
  expect(record.status).toBe("refunded");
});
