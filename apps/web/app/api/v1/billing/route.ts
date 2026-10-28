import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { getBilling } from "@/lib/repo";
import { refreshPayoutStatus } from "@/lib/billing";
import { billableQuantity, subscriptionQuantity, stripeConfigured } from "@/lib/stripe";
import { managerCheckoutEnabled, managerSchemaReady } from "@/lib/manager-release";
export const dynamic = "force-dynamic";
export async function GET() {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const billing = await getBilling(host.user.id);
  if (!billing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const payoutsReady = billing.stripeAccountId && !billing.payoutsReady
    ? await refreshPayoutStatus(host.user.id, billing.stripeAccountId)
    : billing.payoutsReady;
  return NextResponse.json({
    stripe: stripeConfigured(),
    checkoutConfigured: stripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    managerCheckoutAvailable: managerCheckoutEnabled() && await managerSchemaReady(),
    emailVerified: host.user.emailVerified,
    plan: billing.plan,
    status: billing.subscriptionStatus,
    subscribed: Boolean(billing.stripeSubscriptionId && !["canceled", "incomplete_expired"].includes(billing.subscriptionStatus ?? "")),
    propertyCount: billing.propertyCount,
    billableQuantity: subscriptionQuantity(billing.plan, billing.propertyCount),
    perPropertyQuantity: billableQuantity(billing.propertyCount),
    payouts: { started: Boolean(billing.stripeAccountId), ready: payoutsReady },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
