import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type Stripe from "stripe";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";

const mocked = vi.hoisted(() => ({
  retrievePaymentIntent: vi.fn(),
}));
vi.mock("./stripe", () => ({
  stripeClient: () => ({ paymentIntents: { retrieve: mocked.retrievePaymentIntent } }),
  stripeLiveMode: () => false,
  planFromSubscription: () => "free",
}));
vi.mock("./repo", () => ({
  applySubscription: vi.fn(),
  settleExtraCheckout: vi.fn(),
}));

import { handleVerifiedStripeEvent } from "./stripe-events";

const pg = new PGlite();
const owner = crypto.randomUUID();
const propertyId = "commissioned-qa";
const paymentRef = "pi_founding_five_qa_1";
const sessionId = "cs_founding_five_qa_1";

beforeAll(async () => {
  setQueryOverride(async (text, params) =>
    (await pg.query(text, params)).rows as Record<string, unknown>[],
  );
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")))
    await pg.exec(statement);
  await query("INSERT INTO users(id,email,plan) VALUES ($1,'owner@example.test','free')", [owner]);
  await query(
    "INSERT INTO properties(id,owner_id,slug,status,data,published_at) VALUES ($1,$2,'qa-hosting','published','{}',now())",
    [propertyId, owner],
  );
  await query(
    "INSERT INTO commissioned_guide_orders(property_id,owner_id,checkout_session_id,agreement_version,agreement_accepted_at) VALUES ($1,$2,$3,'qa-v1',now())",
    [propertyId, owner, sessionId],
  );
  mocked.retrievePaymentIntent.mockResolvedValue({
    id: paymentRef,
    status: "succeeded",
    livemode: false,
    metadata: { app: "stayguide", kind: "commissioned_hosting", qa_only: "true", user_id: owner, property_id: propertyId },
  });
});

afterAll(async () => {
  setQueryOverride(null);
  await pg.close();
  vi.clearAllMocks();
});

function stripeEvent(type: string, id: string, object: unknown) {
  return {
    id,
    type,
    created: 1_800_000_000,
    livemode: false,
    data: { object },
  } as unknown as Stripe.Event;
}

it("records only a verified test-mode payment, safely ignores failed payment, and deduplicates webhook retries", async () => {
  const session = {
    id: sessionId,
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    payment_intent: paymentRef,
    metadata: { app: "stayguide", kind: "commissioned_hosting", qa_only: "true", user_id: owner, property_id: propertyId },
  };
  mocked.retrievePaymentIntent.mockResolvedValueOnce({
    id: paymentRef, status: "requires_payment_method", livemode: false,
    metadata: { app: "stayguide", kind: "commissioned_hosting", qa_only: "true", user_id: owner, property_id: propertyId },
  });
  expect(await handleVerifiedStripeEvent(stripeEvent("checkout.session.completed", "evt_failed_qa", session))).toBe("ignored");
  expect((await query<{ status: string }>("SELECT status FROM commissioned_guide_orders WHERE checkout_session_id=$1", [sessionId]))[0].status).toBe("pending");

  expect(await handleVerifiedStripeEvent(stripeEvent("checkout.session.completed", "evt_paid_qa", session))).toBe("commissioned_hosting:paid");
  expect((await query<{ status: string; payment_reference: string }>("SELECT status,payment_reference FROM commissioned_guide_orders WHERE checkout_session_id=$1", [sessionId]))[0]).toEqual({ status: "paid", payment_reference: paymentRef });
  expect(await handleVerifiedStripeEvent(stripeEvent("checkout.session.completed", "evt_paid_qa", session))).toBe("duplicate");
});

it("cancels expired unpaid orders and records full refunds without creating or extending hosting", async () => {
  const expired = {
    id: "cs_expired_qa", mode: "payment",
    metadata: { app: "stayguide", kind: "commissioned_hosting", qa_only: "true", user_id: owner, property_id: propertyId },
  };
  await query(
    "INSERT INTO commissioned_guide_orders(property_id,owner_id,checkout_session_id,agreement_version,agreement_accepted_at) VALUES ($1,$2,'cs_expired_qa','qa-v1',now())",
    [propertyId, owner],
  );
  expect(await handleVerifiedStripeEvent(stripeEvent("checkout.session.expired", "evt_expired_qa", expired))).toBe("commissioned_hosting:cancelled");
  expect((await query<{ status: string }>("SELECT status FROM commissioned_guide_orders WHERE checkout_session_id='cs_expired_qa'"))[0].status).toBe("cancelled");

  await query(
    "INSERT INTO commissioned_guide_hosting(property_id,owner_id,payment_reference,agreement_version,agreement_accepted_at,payment_verified_at,published_at,starts_at,ends_at) VALUES ($1,$2,$3,'qa-v1',now(),now(),now(),now(),now()+interval '12 months')",
    [propertyId, owner, paymentRef],
  );
  const charge = { id: "ch_qa", payment_intent: paymentRef, refunded: true, amount: 4900, amount_refunded: 4900, customer: null };
  expect(await handleVerifiedStripeEvent(stripeEvent("charge.refunded", "evt_refund_qa", charge))).toBe("ignored");
  expect((await query<{ status: string }>("SELECT status FROM commissioned_guide_hosting WHERE property_id=$1", [propertyId]))[0].status).toBe("refunded");
  expect((await query<{ status: string }>("SELECT status FROM commissioned_guide_orders WHERE payment_reference=$1", [paymentRef]))[0].status).toBe("refunded");
  expect((await query<{ plan: string }>("SELECT plan FROM users WHERE id=$1", [owner]))[0].plan).toBe("free");
});
