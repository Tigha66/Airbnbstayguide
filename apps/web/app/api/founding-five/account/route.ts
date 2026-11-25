import { NextResponse } from "next/server";
import { assertStripeAccountIdentity, StripeAccountIdentityError } from "@/lib/stripe";

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
  } catch (error) {
    const diagnosticCode = error instanceof StripeAccountIdentityError
      ? error.code
      : "unexpected_identity_check_failure";
    const stripeStatus = error instanceof StripeAccountIdentityError
      ? error.stripeStatus
      : undefined;
    // Log only a fixed diagnostic code and HTTP status; never log keys or Stripe response bodies.
    console.error("[stripe] account identity check failed", { diagnosticCode, stripeStatus });
    return NextResponse.json(
      { verified: false, error: "Stripe account identity verification failed", diagnosticCode },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
