import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { clearStripeCustomer, getBilling } from "@/lib/repo";
import { ensureCustomer } from "@/lib/billing";
import { appUrl, billableQuantity, isMissing, priceId, stripeClient, stripeConfigured } from "@/lib/stripe";
import { parseJsonOrNull, safeOrigin, unavailable } from "@/lib/api";
const schema = z.object({ plan: z.enum(["starter", "pro"]), yearly: z.boolean().default(false) });
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!stripeConfigured()) return unavailable("Billing");
  const host = await requireHost();
  if ("response" in host) return host.response;
  const parsed = schema.safeParse(parseJsonOrNull(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Choose a plan" }, { status: 400 });
  const billing = await getBilling(host.user.id);
  let subscribed = Boolean(billing?.stripeSubscriptionId && billing.subscriptionStatus !== "canceled");
  if (subscribed) {
    try {
      const sub = await stripeClient().subscriptions.retrieve(billing!.stripeSubscriptionId!);
      subscribed = !["canceled", "incomplete_expired"].includes(sub.status);
    } catch (error) {
      if (!isMissing(error)) throw error;
      await clearStripeCustomer(host.user.id);
      subscribed = false;
    }
  }
  if (subscribed)
    return NextResponse.json({ error: "You already have a subscription. Use “Manage billing” to change plans.", code: "ALREADY_SUBSCRIBED" }, { status: 409 });
  const origin = appUrl(request);
  try {
    const session = await stripeClient().checkout.sessions.create({
      mode: "subscription",
      customer: await ensureCustomer(host.user),
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
