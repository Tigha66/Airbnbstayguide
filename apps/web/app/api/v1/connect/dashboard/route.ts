import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { getBilling } from "@/lib/repo";
import { stripeClient, stripeConfigured } from "@/lib/stripe";
import { safeOrigin, unavailable } from "@/lib/api";
/** One-time link to the host's Stripe Express dashboard (payouts, balances). */
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!stripeConfigured()) return unavailable("Payouts");
  const host = await requireHost();
  if ("response" in host) return host.response;
  const billing = await getBilling(host.user.id);
  if (!billing?.stripeAccountId || !billing.payoutsReady) return NextResponse.json({ error: "Finish payout setup first." }, { status: 404 });
  try {
    const link = await stripeClient().accounts.createLoginLink(billing.stripeAccountId);
    return NextResponse.json({ url: link.url });
  } catch {
    return NextResponse.json({ error: "Could not open your payouts dashboard." }, { status: 502 });
  }
}
