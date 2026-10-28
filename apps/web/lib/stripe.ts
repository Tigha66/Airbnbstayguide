import Stripe from "stripe";
import { createHash } from "node:crypto";
import { applicationOrigin } from "./origin";
import { applicationFee, plans, CURRENCY, type Plan } from "@stayguide/shared";

export const stripeConfigured = () => /^(?:sk|rk)_(?:test|live)_/.test(process.env.STRIPE_SECRET_KEY ?? "");
export const stripeLiveMode = () => /^(?:sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
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
      (plan === "manager" && price.lookup_key !== lookupKey(plan, yearly)) ||
      price.recurring?.interval !== (yearly ? "year" : "month") || price.recurring.interval_count !== 1)
    throw new Error("The selected subscription price needs operator configuration");
  return price.id;
}
export async function portalConfigurationId() {
  const stripe = stripeClient();
  const configured = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  const configuration = configured ? await stripe.billingPortal.configurations.retrieve(configured)
    : (await stripe.billingPortal.configurations.list({ active: true, limit: 100 })).data.find(item => item.metadata?.app === "stayguide");
  if (!configuration?.active || configuration.metadata?.app !== "stayguide" ||
      configuration.features.subscription_update.enabled ||
      !configuration.features.subscription_cancel.enabled)
    throw new Error("Configure StayGuide's reviewed cancellation-only billing portal first");
  return configuration.id;
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
  const validManager = () => {
    const recurring = price?.recurring;
    return sub.items.data.length === 1 && sub.items.data[0]?.quantity === 1 &&
      price?.currency === CURRENCY && recurring?.interval_count === 1 &&
      ((recurring.interval === "month" && price.unit_amount === plans.manager.monthly * 100) ||
       (recurring.interval === "year" && price.unit_amount === plans.manager.monthly * 1000));
  };
  for (const plan of ["starter", "pro", "manager"] as const) {
    for (const interval of ["MONTH", "YEAR"] as const) {
      const configured = process.env["STRIPE_PRICE_" + plan.toUpperCase() + "_" + interval]?.trim();
      if (configured && price?.id === configured) return plan === "manager" && !validManager() ? "free" : plan;
    }
  }
  const key = price?.lookup_key ?? "";
  const match = /^stayguide_(starter|pro|manager)_(monthly|yearly)(?:_[a-z]{3})?$/.exec(key);
  if (!match || (match[1] === "manager" && !validManager())) return "free";
  return match[1] as Plan;
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
