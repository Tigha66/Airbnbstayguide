import { NextResponse } from "next/server";
import { assertStripeAccountIdentity } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** SSO-protected, read-only check for the isolated Founding Five Preview Stripe account. */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview" || !process.env.STRIPE_EXPECTED_ACCOUNT_ID)
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const account = await assertStripeAccountIdentity();
    return NextResponse.json(
      { verified: true, accountId: account.id, livemode: account.livemode },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { verified: false, error: "Stripe account identity verification failed" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
