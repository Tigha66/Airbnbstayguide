import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireHost } from "@/lib/session";
import { appUrl, checkoutIdentity, stripeClient, stripeConfigured, stripeLiveMode } from "@/lib/stripe";
import { parseJson, safeOrigin } from "@/lib/api";

export const dynamic = "force-dynamic";
const agreementVersion = "founding-five-qa-v1";
const schema = z.object({
  propertyId: z.string().trim().min(1).max(80),
  qaAgreementAccepted: z.literal(true),
});
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

function qaCheckoutEnabled() {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.FOUNDING_FIVE_QA_ENABLED === "true" &&
    stripeConfigured() && !stripeLiveMode() &&
    Boolean(process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID);
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return reply({ error: "Invalid origin" }, 403);
  if (!qaCheckoutEnabled()) return reply({ error: "Founding Five QA checkout is not enabled here." }, 503);
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (!host.user.emailVerified) return reply({ error: "Verify your email before starting QA checkout." }, 403);

  let input;
  try { input = schema.safeParse(parseJson(await request.text())); }
  catch { return reply({ error: "Invalid checkout request." }, 400); }
  if (!input.success) return reply({ error: "Select a property and confirm the QA-only test agreement." }, 400);

  const propertyId = input.data.propertyId;
  const [property] = await query<{ id: string }>(
    "SELECT id FROM properties WHERE id=$1 AND owner_id=$2",
    [propertyId, host.user.id],
  );
  if (!property) return reply({ error: "Property not found." }, 404);

  try {
    const stripe = stripeClient();
    const configuredPriceId = process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID!.trim();
    const price = await stripe.prices.retrieve(configuredPriceId);
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);
    if (!price.active || price.currency !== "gbp" || price.unit_amount !== 4900 || price.recurring ||
        price.metadata?.qa_only !== "true" || product.metadata?.qa_only !== "true" ||
        product.metadata?.environment !== "test_mode_only")
      return reply({ error: "The configured Founding Five price is not the approved QA-only one-time £49 GBP price." }, 503);

    const [existing] = await query<{
      id: string; checkout_session_id: string; status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
    }>(
      "SELECT id, checkout_session_id, status FROM commissioned_guide_orders WHERE property_id=$1 AND owner_id=$2 AND status IN ('pending','paid','fulfilled') ORDER BY created_at DESC LIMIT 1",
      [propertyId, host.user.id],
    );
    if (existing?.status === "pending") {
      const previous = await stripe.checkout.sessions.retrieve(existing.checkout_session_id);
      if (previous.status === "open" && previous.url) return reply({ url: previous.url, reused: true });
      if (previous.status === "complete" && previous.payment_status === "paid") {
        const paymentReference = typeof previous.payment_intent === "string" ? previous.payment_intent : previous.payment_intent?.id;
        await query(
          "UPDATE commissioned_guide_orders SET status='paid', payment_reference=$2, updated_at=now() WHERE id=$1 AND status='pending'",
          [existing.id, paymentReference ?? null],
        );
        return reply({ error: "Payment is recorded. Publish the approved guide, then complete hosting activation." }, 409);
      }
      if (previous.status === "expired") {
        await query("UPDATE commissioned_guide_orders SET status='cancelled', updated_at=now() WHERE id=$1 AND status='pending'", [existing.id]);
      } else {
        return reply({ error: "An existing QA checkout needs to finish or expire before another can start." }, 409);
      }
    } else if (existing) {
      return reply({ error: "This property already has a paid or fulfilled Founding Five order." }, 409);
    }

    const identity = checkoutIdentity(`${host.user.id}:${propertyId}`, price.id, 1);
    const acceptedAt = new Date().toISOString();
    const origin = appUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: host.user.email,
      client_reference_id: host.user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        app: "stayguide",
        kind: "commissioned_hosting",
        qa_only: "true",
        user_id: host.user.id,
        property_id: propertyId,
        agreement_version: agreementVersion,
        agreement_accepted_at: acceptedAt,
        price_id: price.id,
      },
      payment_intent_data: {
        metadata: {
          app: "stayguide",
          kind: "commissioned_hosting",
          qa_only: "true",
          user_id: host.user.id,
          property_id: propertyId,
        },
      },
      success_url: origin + "/dashboard/editor?foundingFive=payment-received",
      cancel_url: origin + "/dashboard/editor?foundingFive=cancelled",
    }, { idempotencyKey: identity.idempotencyKey });

    await query(
      `INSERT INTO commissioned_guide_orders
        (property_id, owner_id, checkout_session_id, agreement_version, agreement_accepted_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (checkout_session_id) DO NOTHING`,
      [propertyId, host.user.id, session.id, agreementVersion, acceptedAt],
    );
    return reply({ url: session.url });
  } catch {
    return reply({ error: "QA checkout could not be prepared. No hosting or paid subscription was granted." }, 502);
  }
}
