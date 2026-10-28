/**
 * Creates (or reuses) StayGuide's Stripe products, prices, Customer Portal
 * configuration and webhook endpoint. Safe to re-run.
 *   STRIPE_SECRET_KEY=sk_... APP_URL=https://www.getstayguide.com npx tsx scripts/stripe-setup.mts
 * New webhook secrets are written once to STRIPE_WEBHOOK_SECRET_FILE (mode 0600),
 * outside the repository. Never prints credentials. Everything is tagged metadata.app=stayguide.
 */
import Stripe from "stripe";
import { open, unlink } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
if (!key || !appUrl) throw new Error("Set STRIPE_SECRET_KEY and APP_URL");
const origin = new URL(appUrl);
if (origin.protocol !== "https:" || origin.origin !== appUrl)
  throw new Error("APP_URL must be an HTTPS origin without a path or credentials");
if (/^(?:sk|rk)_live_/.test(key) && process.env.STRIPE_ALLOW_LIVE_SETUP !== "true")
  throw new Error("Live Stripe setup requires explicit STRIPE_ALLOW_LIVE_SETUP=true after release review.");
if (process.env.ROTATE_WEBHOOK) throw new Error("Create and verify a replacement webhook before retiring an existing endpoint; automatic rotation is disabled.");
const stripe = new Stripe(key);
const expectedAccount = process.env.STRIPE_EXPECTED_ACCOUNT_ID;
if (!expectedAccount || (await stripe.accounts.retrieve(null)).id !== expectedAccount)
  throw new Error("Set STRIPE_EXPECTED_ACCOUNT_ID to the reviewed account before setup");

const PLANS = [
  { plan: "starter", name: "StayGuide Starter", monthly: 900 },
  { plan: "pro", name: "StayGuide Pro", monthly: 1900 },
  { plan: "manager", name: "StayGuide Manager", monthly: 19900 },
] as const;

for (const p of PLANS) {
  const found = await stripe.products.search({ query: `metadata['app']:'stayguide' AND metadata['plan']:'${p.plan}'` });
  const product =
    found.data[0] ??
    (await stripe.products.create({
      name: p.name,
      description: p.plan === "manager" ? "Flat portfolio subscription for up to 50 properties. Availability is controlled by StayGuide launch gates." : "Per property, per month. Digital guidebook, AI concierge and extras store.",
      metadata: { app: "stayguide", plan: p.plan },
    }));
  for (const [interval, amount] of [["month", p.monthly], ["year", p.monthly * 10]] as const) {
    // Reviewed USD catalogue; runtime requests never create prices.
    const lookup = `stayguide_${p.plan}_${interval === "month" ? "monthly" : "yearly"}_usd`;
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true });
    const price =
      existing.data[0] ??
      (await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: amount,
        recurring: { interval },
        lookup_key: lookup,
        nickname: `${p.name} ${interval}ly`,
        metadata: { app: "stayguide", plan: p.plan },
      }));
    if (price.currency !== "usd" || price.unit_amount !== amount || price.recurring?.interval !== interval ||
        price.recurring.interval_count !== 1 || price.product !== product.id)
      throw new Error(`Existing ${lookup} does not match the reviewed catalogue; no price was replaced`);
    console.log(`STRIPE_PRICE_${p.plan.toUpperCase()}_${interval === "month" ? "MONTH" : "YEAR"}=${price.id}`);
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
    // Plan changes require app-side limits and rollout checks. The portal must
    // not provide an alternate route around them.
    subscription_update: { enabled: false },
  },
  metadata: { app: "stayguide" },
};
const portal = configs.data.find((c) => c.metadata?.app === "stayguide" && c.active &&
  !c.features.subscription_update.enabled && c.features.subscription_cancel.enabled &&
  c.business_profile?.privacy_policy_url === `${appUrl}/legal/privacy`);
// Preserve configurations already used by other environments/subscribers.
const configuredPortal = portal ?? await stripe.billingPortal.configurations.create(portalParams);
console.log(`STRIPE_PORTAL_CONFIGURATION_ID=${configuredPortal.id}`);

const url = `${appUrl}/api/stripe/webhook`;
const events: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "invoice.paid",
  "charge.refunded",
  "charge.dispute.created",
  "radar.early_fraud_warning.created",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existing = endpoints.data.find((e) => e.url === url);
if (existing) {
  if (existing.metadata?.app !== "stayguide") throw new Error("Existing webhook is not tagged for StayGuide; review it manually");
  await stripe.webhookEndpoints.update(existing.id, { enabled_events: events });
  console.log(`webhook ${url} already exists (the existing secret remains unchanged)`);
} else {
  const file = process.env.STRIPE_WEBHOOK_SECRET_FILE;
  const repository = resolve(import.meta.dirname, "../../..");
  const withinRepo = file ? relative(repository, resolve(file)) : "";
  if (!file || !isAbsolute(file) || (!withinRepo.startsWith("../") && withinRepo !== ".."))
    throw new Error("For a new webhook, set STRIPE_WEBHOOK_SECRET_FILE to a new absolute file outside the repository");
  const output = await open(file, "wx", 0o600);
  try {
    const created = await stripe.webhookEndpoints.create({ url, enabled_events: events, metadata: { app: "stayguide" }, description: "StayGuide billing + extras" });
    await output.writeFile(`STRIPE_WEBHOOK_SECRET=${created.secret}\n`);
    console.log("New webhook secret saved to the private operator file. Add it to the matching deployment environment.");
  } catch (error) {
    await unlink(file);
    throw error;
  } finally { await output.close(); }
}
