import Stripe from "stripe";
import { createHash } from "node:crypto";
import { applicationOrigin } from "./origin";
import { applicationFee, plans, CURRENCY, type Plan } from "@stayguide/shared";

export const stripeConfigured = () => /^(?:sk|rk)_(?:test|live)_/.test(process.env.STRIPE_SECRET_KEY ?? "");
export const stripeLiveMode = () => /^(?:sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");

export type StripeAccountIdentityFailureCode =
  | "missing_secret_key"
  | "invalid_secret_key_format"
  | "missing_expected_account"
  | "stripe_request_timeout"
  | "stripe_network_error"
  | "stripe_authentication_failed"
  | "stripe_permission_denied"
  | "stripe_rate_limited"
  | "stripe_api_error"
  | "stripe_response_invalid_json" | "stripe_response_missing_identity_fields"
  | "stripe_account_mismatch"
  | "stripe_mode_mismatch"
  | "unexpected_identity_check_failure";

/** Safe diagnostic error: never include or log API credentials or Stripe response bodies. */
export class StripeAccountIdentityError extends Error {
  constructor(
    readonly code: StripeAccountIdentityFailureCode,
    readonly stripeStatus?: number,
    readonly responseContentType?: string,
    readonly responseHasId?: boolean,
    readonly responseHasLivemode?: boolean,
  ) {
    super(code);
    this.name = "StripeAccountIdentityError";
  }
}

/** Refuse QA billing operations unless the API key resolves to the operator-approved Stripe account and mode. */
export async function assertStripeAccountIdentity() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const expectedAccountId = process.env.STRIPE_EXPECTED_ACCOUNT_ID?.trim();
  if (!secretKey) throw new StripeAccountIdentityError("missing_secret_key");
  if (!stripeConfigured()) throw new StripeAccountIdentityError("invalid_secret_key_format");
  if (!expectedAccountId) throw new StripeAccountIdentityError("missing_expected_account");
  // Founding Five is an isolated QA flow; never permit a live-mode key here.
  if (stripeLiveMode()) throw new StripeAccountIdentityError("stripe_mode_mismatch");

  let response: Response;
  try {
    response = await fetch("https://api.stripe.com/v1/account", {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError")
      throw new StripeAccountIdentityError("stripe_request_timeout");
    throw new StripeAccountIdentityError("stripe_network_error");
  }

  if (!response.ok) {
    const code = response.status === 401 ? "stripe_authentication_failed"
      : response.status === 403 ? "stripe_permission_denied"
      : response.status === 429 ? "stripe_rate_limited"
      : "stripe_api_error";
    throw new StripeAccountIdentityError(code, response.status);
  }

  const responseContentType = response.headers.get("content-type") ?? undefined;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new StripeAccountIdentityError(
      "stripe_response_invalid_json",
      response.status,
      responseContentType,
    );
  }
  // Stripe's /v1/account response provides the account ID, but not a livemode field.
  // Determine mode from the API key prefix; the configured account ID independently
  // pins this integration to the intended account or sandbox.
  const account = payload && typeof payload === "object"
    ? payload as { id?: unknown }
    : null;
  if (!account || typeof account.id !== "string")
    throw new StripeAccountIdentityError(
      "stripe_response_missing_identity_fields",
      response.status,
      responseContentType,
      Boolean(account && typeof account.id === "string"),
    );
  if (account.id !== expectedAccountId)
    throw new StripeAccountIdentityError("stripe_account_mismatch", response.status);
  return { id: account.id, livemode: false };
}
let client: Stripe | null = null;
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15_000, maxNetworkRetries: 1 });
  return client;
}
export const appUrl = (_request?: Request) => { void _request; return applicationOrigin(); };

/**
 * Plan prices are found in the reviewed catalogue by lookup key. Older keys without a currency suffix
 * (the original USD prices) are still recognised for existing subscriptions.
 */
export const lookupKey = (plan: "starter" | "pro" | "manager", yearly: boolean) =>
  `stayguide_${plan}_${yearly ? "yearly" : "monthly"}_${CURRENCY}`;
/** Read the reviewed catalogue; customer requests never create prices or modify portal settings. */
export async function priceId(plan: "starter" | "pro" | "manager", yearly: boolean) {
  const envName = "STRIPE_PRICE_" + plan.toUpperCase() + "_" + (yearly ? "YEAR" : "MONTH");
  const stripe = stripeClient();
  const configured = process.env[envName]?.trim();
  const price = configured ? await stripe.prices.retrieve(configured)
    : (await stripe.prices.list({ lookup_keys: [lookupKey(plan, yearly)], active: true, limit: 1 })).data[0];
  const expected = plans[plan].monthly * 100 * (yearly ? 10 : 1);
  if (!price || !price.active || price.currency !== CURRENCY || price.unit_amount !== expected ||
      price.recurring?.interval !== (yearly ? "year" : "month") || price.recurring.interval_count !== 1)
    throw new Error("The selected subscription price needs operator configuration");
  return price.id;
}
export async function portalConfigurationId() {
  if (process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim()) return process.env.STRIPE_PORTAL_CONFIGURATION_ID.trim();
  const { data } = await stripeClient().billingPortal.configurations.list({ active: true, limit: 100 });
  const configuration = data.find((item) => item.metadata?.app === "stayguide")?.id;
  if (!configuration) throw new Error("Configure StayGuide's self-service billing portal first");
  return configuration;
}
export function checkoutIdentity(userId: string, price: string, quantity: number, time = Date.now()) {
  const key = ["stayguide", "checkout", userId, price, quantity, Math.floor(time / 900_000)].join(":");
  const suffix = [...createHash("sha256").update(key).digest().subarray(0, 8)].map((b) => String.fromCharCode(97 + b % 26)).join("");
  return { idempotencyKey: key, integrationIdentifier: "stayguide_" + suffix };
}

/** Maps a Stripe subscription to the plan the host should have right now. */
export function planFromSubscription(sub: Pick<Stripe.Subscription, "status" | "items">): Plan {
  if (!["active", "trialing"].includes(sub.status)) return "free";
  const price = sub.items.data[0]?.price;
  for (const plan of ["starter", "pro", "manager"] as const) {
    for (const interval of ["MONTH", "YEAR"] as const) {
      const configured = process.env["STRIPE_PRICE_" + plan.toUpperCase() + "_" + interval]?.trim();
      if (configured && price?.id === configured) return plan;
    }
  }
  const key = price?.lookup_key ?? "";
  const match = /^stayguide_(starter|pro|manager)_(monthly|yearly)(?:_[a-z]{3})?$/.exec(key);
  return match ? (match[1] as Plan) : "free";
}
/** Subscriptions are billed per property; never below one. */
export const billableQuantity = (propertyCount: number) => Math.max(1, Math.min(100, propertyCount));
/** Manager is a flat-rate subscription; Starter and Pro retain per-property billing. */
export const subscriptionQuantity = (plan: Plan, propertyCount: number) => plan === "manager" ? 1 : billableQuantity(propertyCount);

/** Checkout parameters for a guest paying for an extra; money goes to the host minus the 5% platform fee. */
export function extraCheckoutParams(input: {
  requestId: string;
  propertyId: string;
  slug: string;
  extra: { name: string; description: string; price: number; approval: boolean };
  destination: string;
  guestEmail?: string;
  origin: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: input.extra.price,
          product_data: { name: input.extra.name, description: input.extra.description || undefined },
        },
      },
    ],
    customer_email: input.guestEmail,
    payment_intent_data: {
      // Extras that need host approval are authorised now and only captured when the host approves.
      capture_method: input.extra.approval ? "manual" : "automatic",
      application_fee_amount: applicationFee(input.extra.price),
      transfer_data: { destination: input.destination },
      metadata: { app: "stayguide", extra_request_id: input.requestId, property_id: input.propertyId },
    },
    metadata: { app: "stayguide", kind: "extra", extra_request_id: input.requestId },
    integration_identifier: checkoutIdentity(input.requestId, "extra", input.extra.price, 0).integrationIdentifier,
    success_url: `${input.origin}/g/${input.slug}?extra=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/g/${input.slug}?extra=cancelled`,
  };
}
/** True when Stripe says the object doesn't exist in this mode/account (stale test-mode ids). */
export const isMissing = (error: unknown) => (error as { code?: string })?.code === "resource_missing";
