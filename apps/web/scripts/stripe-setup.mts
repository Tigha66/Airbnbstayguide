/**
 * Creates (or reuses) StayGuide's Stripe products, prices, Customer Portal
 * configuration and webhook endpoint. Safe to re-run.
 *   STRIPE_SECRET_KEY=sk_... APP_URL=https://stayguide-gamma.vercel.app npx tsx scripts/stripe-setup.mts
 * Prints STRIPE_WEBHOOK_SECRET when a new endpoint is created. Everything is tagged metadata.app=stayguide.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
if (!key || !appUrl) throw new Error("Set STRIPE_SECRET_KEY and APP_URL");
const stripe = new Stripe(key);

const PLANS = [
  { plan: "starter", name: "StayGuide Starter", monthly: 900 },
  { plan: "pro", name: "StayGuide Pro", monthly: 1900 },
] as const;

const productIds: string[] = [];
const priceIdsByProduct: Record<string, string[]> = {};
for (const p of PLANS) {
  const found = await stripe.products.search({ query: `metadata['app']:'stayguide' AND metadata['plan']:'${p.plan}'` });
  const product =
    found.data[0] ??
    (await stripe.products.create({
      name: p.name,
      description: "Per property, per month. Digital guidebook, AI concierge and extras store.",
      metadata: { app: "stayguide", plan: p.plan },
    }));
  productIds.push(product.id);
  priceIdsByProduct[product.id] = [];
  for (const [interval, amount] of [["month", p.monthly], ["year", p.monthly * 10]] as const) {
    // Prices are in GBP (pence); the app also creates these on first use.
    const lookup = `stayguide_${p.plan}_${interval === "month" ? "monthly" : "yearly"}_gbp`;
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true });
    const price =
      existing.data[0] ??
      (await stripe.prices.create({
        product: product.id,
        currency: "gbp",
        unit_amount: amount,
        recurring: { interval },
        lookup_key: lookup,
        nickname: `${p.name} ${interval}ly`,
        metadata: { app: "stayguide", plan: p.plan },
      }));
    priceIdsByProduct[product.id].push(price.id);
    console.log(`price ${lookup} → ${price.id}`);
  }
}

const configs = await stripe.billingPortal.configurations.list({ limit: 100 });
const portalParams: Stripe.BillingPortal.ConfigurationCreateParams = {
  business_profile: { headline: "Manage your StayGuide plan", privacy_policy_url: `${appUrl}/legal/privacy`, terms_of_service_url: `${appUrl}/legal/terms` },
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: productIds.map((product) => ({ product, prices: priceIdsByProduct[product] })),
    },
  },
  metadata: { app: "stayguide" },
};
const portal = configs.data.find((c) => c.metadata?.app === "stayguide" && c.active);
if (portal) await stripe.billingPortal.configurations.update(portal.id, portalParams as Stripe.BillingPortal.ConfigurationUpdateParams);
else await stripe.billingPortal.configurations.create(portalParams);
console.log("portal configuration ready");

const url = `${appUrl}/api/stripe/webhook`;
const events: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existing = endpoints.data.find((e) => e.url === url);
if (existing && !process.env.ROTATE_WEBHOOK) {
  await stripe.webhookEndpoints.update(existing.id, { enabled_events: events });
  console.log(`webhook ${url} already exists (set ROTATE_WEBHOOK=1 to recreate and print a new secret)`);
} else {
  if (existing) await stripe.webhookEndpoints.del(existing.id);
  const created = await stripe.webhookEndpoints.create({ url, enabled_events: events, metadata: { app: "stayguide" }, description: "StayGuide billing + extras" });
  console.log(`STRIPE_WEBHOOK_SECRET=${created.secret}`);
}
