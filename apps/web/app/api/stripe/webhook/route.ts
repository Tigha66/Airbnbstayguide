import { NextResponse } from "next/server";
import { stripeClient, stripeConfigured } from "@/lib/stripe";
import { handleVerifiedStripeEvent } from "@/lib/stripe-events";
import { unavailable } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) return unavailable("Billing");
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(payload, signature ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    const result = await handleVerifiedStripeEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("[stripe] webhook handling failed", { type: event.type, error: error instanceof Error ? error.name : "UnknownError" });
    // 500 makes Stripe retry later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
