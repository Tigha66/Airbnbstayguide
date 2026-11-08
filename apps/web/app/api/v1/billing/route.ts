import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { getBilling } from "@/lib/repo";
import { refreshPayoutStatus } from "@/lib/billing";
import { subscriptionQuantity, stripeCheckoutAllowed } from "@/lib/stripe";
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
    stripe: stripeCheckoutAllowed(),
    plan: billing.plan,
    trial: { active: Boolean(billing.trialActive), endsAt: billing.trialEndsAt ?? null, days: 14, propertyLimit: 1 },
    status: billing.subscriptionStatus,
    // A terminal incomplete_expired Checkout does not create a usable
    // subscription. Hosts must be able to choose a new plan instead of
    // being trapped in Manage billing after a failed first payment.
    subscribed: Boolean(billing.stripeSubscriptionId &&
      !["canceled", "incomplete_expired"].includes(billing.subscriptionStatus ?? "")),
    propertyCount: billing.propertyCount,
    billableQuantity: subscriptionQuantity(billing.plan, billing.propertyCount),
    payouts: { started: Boolean(billing.stripeAccountId), ready: payoutsReady },
  });
}
