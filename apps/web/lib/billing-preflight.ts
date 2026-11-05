import { applicationOrigin } from "./origin";
import { dbConfigured, query } from "./db";
import { mailerConfigured, senderDomainReadiness } from "./mailer";
import { portalConfigurationId, priceId, stripeClient, stripeConfigured, stripeLiveMode } from "./stripe";

type Check = { key: string; ok: boolean; detail: string };
export type BillingPreflight = {
  kind: "configuration-only";
  environment: string;
  stripeMode: "live" | "test" | "unconfigured";
  configurationReady: boolean;
  livePaymentVerified: false;
  emailDeliveryVerified: false;
  productionRestoreVerified: false;
  checks: Check[];
};

/** Read-only account-owner diagnostics. No charges, email sends, migrations or secret output. */
export async function billingPreflight(): Promise<BillingPreflight> {
  const checks: Check[] = [];
  const add = (key: string, ok: boolean, detail: string) => checks.push({ key, ok, detail });
  const environment = process.env.VERCEL_ENV ?? "local";

  let originOk = false;
  try {
    const origin = applicationOrigin();
    originOk = origin.startsWith("https://") || (environment === "local" && origin.startsWith("http://localhost:"));
  } catch { /* Misconfigured application URL. */ }
  add("trusted_origin", originOk, originOk ? "Trusted redirects configured." : "Configure a trusted HTTPS application URL.");

  let dbOk = false;
  if (dbConfigured()) {
    try {
      await query("SELECT id, stripe_customer_id, billing_event_created FROM users LIMIT 1");
      await query("SELECT id FROM stripe_webhook_events LIMIT 1");
      await query("SELECT id FROM account_email_tokens LIMIT 1");
      dbOk = true;
    } catch { /* No customer data included in the response. */ }
  }
  add("database_schema", dbOk, dbOk ? "Account and billing tables are accessible." : "Database is unreachable or the account/billing schema is incomplete.");

  const emailOk = mailerConfigured();
  add("account_email_config", emailOk,
    emailOk ? "Email sender is configured; actual delivery remains unverified." : "Account verification email sender is not configured.");
  const sender = emailOk
    ? await senderDomainReadiness()
    : { ok: false, detail: "Configure Resend sender and API key before domain verification." };
  add("email_sender_domain", sender.ok, sender.detail);

  const stripe = stripeConfigured();
  const live = stripe && stripeLiveMode();
  add("stripe_live_key", live, live ? "Live Stripe key configured; transactions still need testing."
    : stripe ? "Stripe is in test mode; do not accept live payments." : "No Stripe key configured.");
  add("stripe_webhook_secret", Boolean(process.env.STRIPE_WEBHOOK_SECRET), "Requires the signing secret for this exact account and endpoint.");

  // Keep each Stripe lookup independent so one incorrectly configured price
  // cannot hide the other products that are correctly sellable.
  if (stripe) {
    await Promise.all((["starter", "pro", "manager"] as const).flatMap(plan =>
      ([false, true] as const).map(async yearly => {
        const key = `price_${plan}_${yearly ? "year" : "month"}`;
        try {
          await priceId(plan, yearly);
          return { key, ok: true, detail: "Active, expected currency, amount and billing interval." };
        } catch {
          return { key, ok: false, detail: "Missing, inactive or mismatched Stripe subscription price." };
        }
      }),
    )).then(results => checks.push(...results));
  } else {
    for (const plan of ["starter", "pro", "manager"] as const)
      for (const interval of ["month", "year"] as const)
        add(`price_${plan}_${interval}`, false, "Stripe key is not configured.");
  }

  let portalOk = false;
  if (stripe) {
    try { portalOk = Boolean(await portalConfigurationId()); } catch { /* Misconfigured portal. */ }
  }
  add("billing_portal", portalOk, portalOk
    ? "Self-service customer billing portal exists."
    : "Configure a StayGuide-tagged Stripe billing portal before selling subscriptions.");

  let webhookOk = false;
  if (stripe) {
    try {
      // Previews are checked against the intended *production* URL. The
      // preview's Vercel hostname must not replace the live Stripe webhook.
      const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
      const canonical = new URL(raw.trim());
      if (canonical.protocol === "https:" && !canonical.username && !canonical.password &&
          canonical.pathname === "/" && !canonical.search && !canonical.hash) {
        const expectedUrl = canonical.origin + "/api/stripe/webhook";
        const required = [
          "checkout.session.completed", "customer.subscription.updated",
          "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed",
        ];
        const endpoints = await stripeClient().webhookEndpoints.list({ limit: 100 });
        webhookOk = endpoints.data.some(endpoint =>
          endpoint.url === expectedUrl && endpoint.status === "enabled" &&
          required.every(type => endpoint.enabled_events.includes("*") || endpoint.enabled_events.includes(type as never)));
      }
    } catch { /* Missing permissions, endpoint, or provider outage: not verified. */ }
  }
  add("stripe_webhook_endpoint", webhookOk, webhookOk
    ? "Live webhook URL enabled with the required subscription events (delivery not tested)."
    : "Confirm Stripe's enabled webhook URL and subscription events for the live site.");

  const configurationReady = checks.every(check => check.ok);
  return {
    kind: "configuration-only",
    environment,
    stripeMode: !stripe ? "unconfigured" : live ? "live" : "test",
    configurationReady,
    livePaymentVerified: false,
    emailDeliveryVerified: false,
    productionRestoreVerified: false,
    checks,
  };
}
