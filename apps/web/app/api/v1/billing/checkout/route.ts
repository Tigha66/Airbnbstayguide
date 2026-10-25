import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { getBilling } from "@/lib/repo";
import { ensureCustomer } from "@/lib/billing";
import { appUrl, billableQuantity, checkoutIdentity, priceId, stripeClient, stripeConfigured } from "@/lib/stripe";
import { parseJson, safeOrigin, unavailable } from "@/lib/api";
const schema = z.object({ plan: z.enum(["starter", "pro"]), yearly: z.boolean().default(false) });
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  if (!safeOrigin(request)) return reply({ error: "Invalid origin" }, 403);
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) return unavailable("Billing");
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (!host.user.emailVerified) return reply({ error: "Verify your email address before starting a paid subscription.", code: "EMAIL_NOT_VERIFIED" }, 403);
  let parsed;
  try { parsed = schema.safeParse(parseJson(await request.text())); }
  catch { return reply({ error: "Choose a plan" }, 400); }
  if (!parsed.success) return reply({ error: "Choose a plan" }, 400);
  try {
    const billing = await getBilling(host.user.id);
    const stripe = stripeClient();
    const customer = await ensureCustomer(host.user);
    const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
    if (subscriptions.data.some((sub) => !["canceled", "incomplete_expired"].includes(sub.status)))
      return reply({ error: "You already have a subscription. Use Manage billing.", code: "ALREADY_SUBSCRIBED" }, 409);
    const price = await priceId(parsed.data.plan, parsed.data.yearly);
    const quantity = billableQuantity(billing?.propertyCount ?? 1);
    const open = await stripe.checkout.sessions.list({ customer, status: "open", limit: 100 });
    const pending = open.data.find((s) => s.mode === "subscription" && s.metadata?.app === "stayguide" &&
      s.metadata.user_id === host.user.id && s.metadata.price_id === price && s.metadata.quantity === String(quantity));
    if (pending?.url) return reply({ url: pending.url });
    const identity = checkoutIdentity(host.user.id, price, quantity);
    const origin = appUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      integration_identifier: identity.integrationIdentifier,
      customer, client_reference_id: host.user.id,
      line_items: [{ price, quantity }],
      subscription_data: { metadata: { app: "stayguide", user_id: host.user.id } },
      metadata: { app: "stayguide", kind: "subscription", user_id: host.user.id, price_id: price, quantity: String(quantity) },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: origin + "/dashboard/billing?checkout=success",
      cancel_url: origin + "/dashboard/billing?checkout=cancelled",
    }, { idempotencyKey: identity.idempotencyKey });
    return reply({ url: session.url });
  } catch {
    return reply({ error: "Checkout is temporarily unavailable. Your existing subscription has not been changed." }, 502);
  }
}
