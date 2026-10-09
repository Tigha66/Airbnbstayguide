import Stripe from "stripe";
import { applicationFee, plans, CURRENCY, type Plan } from "@stayguide/shared";

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
let client: Stripe | null = null;
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
export const appUrl = (request?: Request) =>
  (process.env.NEXT_PUBLIC_APP_URL || (request ? new URL(request.url).origin : "http://localhost:3000")).replace(/\/$/, "");

/**
 * Plan prices are found by lookup key, e.g. stayguide_pro_yearly_usd, and created on first use if
 * missing (scripts/stripe-setup.mts creates the same ones). Older keys without a currency suffix
 * (the original USD prices) are still recognised for existing subscriptions.
 */
export const lookupKey = (plan: "starter" | "pro", yearly: boolean) =>
  `stayguide_${plan}_${yearly ? "yearly" : "monthly"}_${CURRENCY}`;
const priceCache = new Map<string, string>();
async function planProduct(plan: "starter" | "pro") {
  const stripe = stripeClient();
  const found = await stripe.products.search({ query: `metadata['app']:'stayguide' AND metadata['plan']:'${plan}'` });
  return (
    found.data[0]?.id ??
    (
      await stripe.products.create({
        name: `StayGuide ${plans[plan].name}`,
        description: "Per property, per month. Digital guidebook, AI concierge and extras store.",
        metadata: { app: "stayguide", plan },
      })
    ).id
  );
}
/** Optional explicit price ids (STRIPE_PRICE_STARTER_MONTHLY …); without them prices are found by lookup key. */
export const priceOverride = (plan: "starter" | "pro", yearly: boolean) =>
  process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${yearly ? "YEARLY" : "MONTHLY"}`]?.trim() || undefined;
function planForPriceOverride(price: string | undefined): Plan | null {
  if (!price) return null;
  for (const plan of ["starter", "pro"] as const) for (const yearly of [false, true]) if (priceOverride(plan, yearly) === price) return plan;
  return null;
}
export async function priceId(plan: "starter" | "pro", yearly: boolean) {
  const override = priceOverride(plan, yearly);
  if (override) return override;
  const key = lookupKey(plan, yearly);
  const cached = priceCache.get(key);
  if (cached) return cached;
  const stripe = stripeClient();
  const find = async () => (await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 })).data[0]?.id;
  let id = await find();
  if (!id) {
    try {
      const monthly = plans[plan].monthly * 100; // pence
      const price = await stripe.prices.create({
        product: await planProduct(plan),
        currency: CURRENCY,
        unit_amount: yearly ? monthly * 10 : monthly,
        recurring: { interval: yearly ? "year" : "month" },
        lookup_key: key,
        nickname: `StayGuide ${plans[plan].name} ${yearly ? "yearly" : "monthly"} (${CURRENCY.toUpperCase()})`,
        metadata: { app: "stayguide", plan },
      });
      id = price.id;
    } catch (error) {
      // Another request created it at the same moment (lookup keys are unique): use that one.
      id = await find();
      if (!id) throw error;
    }
  }
  priceCache.set(key, id);
  return id;
}
let portalConfig: string | null | undefined;
/** The Customer Portal configuration, kept in sync so plan switches stay in the current currency. */
export async function portalConfigurationId() {
  if (portalConfig !== undefined) return portalConfig ?? undefined;
  const stripe = stripeClient();
  const { data } = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const config = data.find((c) => c.metadata?.app === "stayguide");
  if (!config) {
    portalConfig = null;
    return undefined;
  }
  try {
    const byProduct = new Map<string, string[]>();
    for (const plan of ["starter", "pro"] as const)
      for (const yearly of [false, true]) {
        const price = await stripe.prices.retrieve(await priceId(plan, yearly));
        const product = typeof price.product === "string" ? price.product : price.product.id;
        byProduct.set(product, [...(byProduct.get(product) ?? []), price.id]);
      }
    await stripe.billingPortal.configurations.update(config.id, {
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products: [...byProduct].map(([product, prices]) => ({ product, prices })),
        },
      },
    });
  } catch (error) {
    console.error("[billing] portal price sync failed", error);
  }
  portalConfig = config.id;
  return portalConfig;
}

/** Maps a Stripe subscription to the plan the host should have right now. */
export function planFromSubscription(sub: Pick<Stripe.Subscription, "status" | "items">): Plan {
  if (!["active", "trialing", "past_due"].includes(sub.status)) return "free";
  const price = sub.items.data[0]?.price;
  const fromOverride = planForPriceOverride(price?.id);
  if (fromOverride) return fromOverride;
  const match = /^stayguide_(starter|pro)_(monthly|yearly)(?:_[a-z]{3})?$/.exec(price?.lookup_key ?? "");
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
    success_url: `${input.origin}/g/${input.slug}?extra=success`,
    cancel_url: `${input.origin}/g/${input.slug}?extra=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  };
}
/** True when Stripe says the object doesn't exist in this mode/account (stale test-mode ids). */
export const isMissing = (error: unknown) => (error as { code?: string })?.code === "resource_missing";
