import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { clearStripeAccount, getBilling, setStripeAccount } from "@/lib/repo";
import { appUrl, isMissing, stripeClient, stripeConfigured } from "@/lib/stripe";
import { parseJsonOrNull, safeOrigin, unavailable } from "@/lib/api";
const schema = z.object({ country: z.string().regex(/^[A-Z]{2}$/).optional() });
/** Starts (or resumes) Stripe Express onboarding so the host can receive payments for extras. */
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!stripeConfigured()) return unavailable("Payouts");
  const host = await requireHost();
  if ("response" in host) return host.response;
  const parsed = schema.safeParse(parseJsonOrNull((await request.text()) || "{}"));
  if (!parsed.success) return NextResponse.json({ error: "Choose a country" }, { status: 400 });
  const stripe = stripeClient();
  try {
    const billing = await getBilling(host.user.id);
    let accountId = billing?.stripeAccountId ?? null;
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch (error) {
        if (!isMissing(error)) throw error;
        await clearStripeAccount(host.user.id);
        accountId = null;
      }
    }
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: parsed.data.country,
        email: host.user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { product_description: "Short-term rental guest extras (early check-in, late checkout, transfers)" },
        metadata: { app: "stayguide", user_id: host.user.id },
      });
      accountId = account.id;
      await setStripeAccount(host.user.id, accountId, false);
    }
    const origin = appUrl(request);
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/dashboard/billing?payouts=retry`,
      return_url: `${origin}/dashboard/billing?payouts=done`,
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[connect] onboarding failed", error);
    if (/signed up for Connect/i.test(message))
      return NextResponse.json({ error: "Payouts aren’t enabled on the platform yet (Stripe Connect is not activated).", code: "CONNECT_NOT_ENABLED" }, { status: 503 });
    // Stripe asks the platform to finish its Connect platform profile (business model, loss liability) first.
    if (/platform.?profile|responsibilit|managing losses|loss liability/i.test(message))
      return NextResponse.json(
        {
          error: "Payouts need one more step from StayGuide: the Stripe Connect platform profile isn’t complete yet. Please try again later.",
          code: "CONNECT_PROFILE_INCOMPLETE",
          detail: message.slice(0, 300),
        },
        { status: 503 },
      );
    // Otherwise show Stripe's own explanation (e.g. unsupported country, account under review) so it can be fixed.
    const isStripeError = String((error as { type?: string })?.type ?? "").startsWith("Stripe");
    return NextResponse.json(
      {
        error: isStripeError && message ? `Stripe: ${message.slice(0, 300)}` : "Could not start payout setup. Please try again.",
        code: "CONNECT_FAILED",
      },
      { status: 502 },
    );
  }
}
