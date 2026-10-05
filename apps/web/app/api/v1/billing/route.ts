import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { getBilling } from "@/lib/repo";
import { refreshPayoutStatus } from "@/lib/billing";
import { billableQuantity, stripeConfigured } from "@/lib/stripe";
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
    plan: billing.plan,
    status: billing.subscriptionStatus,
    subscribed: Boolean(billing.stripeSubscriptionId && billing.subscriptionStatus !== "canceled"),
    propertyCount: billing.propertyCount,
    billableQuantity: billableQuantity(billing.propertyCount),
    payouts: { started: Boolean(billing.stripeAccountId), ready: payoutsReady },
  });
}
