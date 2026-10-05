import Stripe from "stripe";
import { applicationFee, type Plan } from "@stayguide/shared";

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
let client: Stripe | null = null;
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
export const appUrl = (request?: Request) =>
  (process.env.NEXT_PUBLIC_APP_URL || (request ? new URL(request.url).origin : "http://localhost:3000")).replace(/\/$/, "");

/** Prices are created by scripts/stripe-setup.mts and found by lookup key, e.g. stayguide_pro_yearly. */
export const lookupKey = (plan: "starter" | "pro", yearly: boolean) => `stayguide_${plan}_${yearly ? "yearly" : "monthly"}`;
const priceCache = new Map<string, string>();
export async function priceId(plan: "starter" | "pro", yearly: boolean) {
  const key = lookupKey(plan, yearly);
  const cached = priceCache.get(key);
  if (cached) return cached;
  const { data } = await stripeClient().prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (!data[0]) throw new Error(`Stripe price ${key} not found. Run scripts/stripe-setup.mts.`);
  priceCache.set(key, data[0].id);
  return data[0].id;
}
let portalConfig: string | null | undefined;
export async function portalConfigurationId() {
  if (portalConfig !== undefined) return portalConfig ?? undefined;
  const { data } = await stripeClient().billingPortal.configurations.list({ active: true, limit: 100 });
  portalConfig = data.find((c) => c.metadata?.app === "stayguide")?.id ?? null;
  return portalConfig ?? undefined;
}

/** Maps a Stripe subscription to the plan the host should have right now. */
export function planFromSubscription(sub: Pick<Stripe.Subscription, "status" | "items">): Plan {
  if (!["active", "trialing", "past_due"].includes(sub.status)) return "free";
  const key = sub.items.data[0]?.price?.lookup_key ?? "";
  const match = /^stayguide_(starter|pro)_(monthly|yearly)$/.exec(key);
  return match ? (match[1] as Plan) : "free";
}
/** Subscriptions are billed per property; never below one. */
export const billableQuantity = (propertyCount: number) => Math.max(1, Math.min(100, propertyCount));

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
          currency: "usd",
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
    success_url: `${input.origin}/g/${input.slug}?extra=success`,
    cancel_url: `${input.origin}/g/${input.slug}?extra=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  };
}
/** True when Stripe says the object doesn't exist in this mode/account (stale test-mode ids). */
export const isMissing = (error: unknown) => (error as { code?: string })?.code === "resource_missing";
