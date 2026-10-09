import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { applySubscription, clearStripeCustomer, getBilling } from "@/lib/repo";
import { ensureCustomer } from "@/lib/billing";
import { appUrl, billableQuantity, isMissing, planFromSubscription, priceId, stripeClient, stripeConfigured } from "@/lib/stripe";
import { parseJson, safeOrigin, unavailable } from "@/lib/api";
const schema = z.object({ plan: z.enum(["starter", "pro"]), yearly: z.boolean().default(false) });
/** Statuses that mean "this subscription is still charging / should block a new one". */
const LIVE_STATUSES = ["active", "trialing", "past_due", "unpaid"];
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!stripeConfigured()) return unavailable("Billing");
  const host = await requireHost();
  if ("response" in host) return host.response;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Choose a plan" }, { status: 400 });
  const billing = await getBilling(host.user.id);
  const customerId = await ensureCustomer(host.user);
  // Ask Stripe directly rather than trusting our own DB: the DB only ever remembers one
  // subscription id, so if a previous checkout's webhook was ever delayed or missed, a stale
  // "not subscribed" row here would otherwise let a second, duplicate subscription get created
  // for the same customer.
  let existing;
  try {
    existing = (await stripeClient().subscriptions.list({ customer: customerId, status: "all", limit: 10 })).data.find((s) =>
      LIVE_STATUSES.includes(s.status),
    );
  } catch (error) {
    console.error("[billing] could not verify existing subscriptions", error);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
  if (existing) {
    // Self-heal: make sure our DB reflects the subscription Stripe says is actually live.
    if (existing.id !== billing?.stripeSubscriptionId)
      await applySubscription({
        customerId,
        userId: host.user.id,
        subscriptionId: existing.id,
        status: existing.status,
        plan: planFromSubscription(existing),
      });
    return NextResponse.json({ error: "You already have a subscription. Use “Manage billing” to change plans.", code: "ALREADY_SUBSCRIBED" }, { status: 409 });
  }
  // Belt-and-braces: also clear out a stale subscription id our own DB thinks is still active.
  if (billing?.stripeSubscriptionId && billing.subscriptionStatus !== "canceled") {
    try {
      await stripeClient().subscriptions.retrieve(billing.stripeSubscriptionId);
    } catch (error) {
      if (!isMissing(error)) throw error;
      await clearStripeCustomer(host.user.id);
    }
  }
  const origin = appUrl(request);
  try {
    const session = await stripeClient().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: host.user.id,
      line_items: [{ price: await priceId(parsed.data.plan, parsed.data.yearly), quantity: billableQuantity(billing?.propertyCount ?? 1) }],
      subscription_data: { metadata: { app: "stayguide", user_id: host.user.id } },
      metadata: { app: "stayguide", kind: "subscription", user_id: host.user.id },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${origin}/dashboard/billing?checkout=success`,
      cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing] checkout failed", error);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
