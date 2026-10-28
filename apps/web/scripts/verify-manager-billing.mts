/** Read-only configuration audit. Does not create customers, sessions or charges. */
import { stripeClient, stripeConfigured, stripeLiveMode, priceId, portalConfigurationId } from "../lib/stripe.ts";
import { managerSchemaReady } from "../lib/manager-release.ts";
import { applicationOrigin } from "../lib/origin.ts";

const requiredEvents = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed"];
const checks: Record<string, boolean> = {};
async function check(name: string, run: () => Promise<boolean>) {
  try { checks[name] = await run(); } catch { checks[name] = false; }
}
checks.stripeKey = stripeConfigured();
checks.signingSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"));
await check("expectedAccount", async () => {
  const expected = process.env.STRIPE_EXPECTED_ACCOUNT_ID;
  return Boolean(expected?.startsWith("acct_") && (await stripeClient().accounts.retrieve()).id === expected);
});
await check("managerMonthlyPrice", async () => Boolean(await priceId("manager", false)));
await check("managerYearlyPrice", async () => Boolean(await priceId("manager", true)));
await check("reviewedPortal", async () => Boolean(await portalConfigurationId()));
await check("databaseSchema", managerSchemaReady);
await check("webhookEndpoint", async () => {
  const endpoints = await stripeClient().webhookEndpoints.list({ limit: 100 });
  return endpoints.data.some(e => e.url === applicationOrigin() + "/api/stripe/webhook" && e.status === "enabled" &&
    e.livemode === stripeLiveMode() && requiredEvents.every(type => e.enabled_events.includes(type as typeof e.enabled_events[number]) || e.enabled_events.includes("*")));
});
const configurationReady = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ mode: stripeLiveMode() ? "live-read-only" : "test", checks, configurationReady,
  deliveryVerified: false, note: "Configuration checks alone do not prove hosted Checkout, Stripe-to-app webhook delivery, renewal or failed-payment recovery. Complete isolated acceptance before enabling sales." }, null, 2));
process.exitCode = configurationReady ? 0 : 1;
