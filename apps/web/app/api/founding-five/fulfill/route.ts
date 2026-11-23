import { NextResponse } from "next/server";
import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { requireHost } from "@/lib/session";
import { stripeClient, stripeConfigured, stripeLiveMode } from "@/lib/stripe";
import { parseJson, safeOrigin } from "@/lib/api";

export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const schema = z.object({ sessionId: z.string().trim().min(10).max(255) });

function qaFulfilmentEnabled() {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.FOUNDING_FIVE_QA_ENABLED === "true" &&
    stripeConfigured() && !stripeLiveMode() &&
    Boolean(process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID);
}

/** Owner-triggered, idempotent fulfilment. Checkout completion alone never grants hosting. */
export async function POST(request: Request) {
  if (!safeOrigin(request)) return reply({ error: "Invalid origin" }, 403);
  if (!qaFulfilmentEnabled()) return reply({ error: "Founding Five QA fulfilment is not enabled here." }, 503);
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (!host.user.emailVerified) return reply({ error: "Verify your email before fulfilment." }, 403);

  let parsed;
  try { parsed = schema.safeParse(parseJson(await request.text())); }
  catch { return reply({ error: "Invalid fulfilment request." }, 400); }
  if (!parsed.success) return reply({ error: "A valid Checkout Session ID is required." }, 400);

  try {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, {
      expand: ["line_items.data.price.product", "payment_intent"],
    });
    const metadata = session.metadata;
    if (session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid" ||
        metadata?.app !== "stayguide" || metadata.kind !== "commissioned_hosting" || metadata.qa_only !== "true" ||
        metadata.user_id !== host.user.id || !metadata.property_id ||
        !metadata.agreement_version || !metadata.agreement_accepted_at ||
        metadata.price_id !== process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID)
      return reply({ error: "The session is not a verified paid QA Founding Five order." }, 409);

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntentId) return reply({ error: "The payment reference is missing." }, 409);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded" || paymentIntent.livemode ||
        paymentIntent.metadata?.app !== "stayguide" || paymentIntent.metadata?.kind !== "commissioned_hosting" ||
        paymentIntent.metadata?.qa_only !== "true" || paymentIntent.metadata?.user_id !== host.user.id ||
        paymentIntent.metadata?.property_id !== metadata.property_id)
      return reply({ error: "Stripe could not independently verify the QA payment." }, 409);

    const priceId = process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID!.trim();
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2, expand: ["data.price.product"] });
    if (lineItems.data.length !== 1 || lineItems.data[0].price?.id !== priceId ||
        lineItems.data[0].quantity !== 1 || lineItems.data[0].amount_total !== 4900 ||
        lineItems.data[0].currency !== "gbp")
      return reply({ error: "The paid line item does not match the QA £49 one-time price." }, 409);
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = typeof price.product === "string" ? await stripe.products.retrieve(productId) : price.product;
    if (!price.active || price.currency !== "gbp" || price.unit_amount !== 4900 || price.recurring ||
        price.metadata?.qa_only !== "true" || product.metadata?.qa_only !== "true" ||
        product.metadata?.environment !== "test_mode_only")
      return reply({ error: "Configured price is not the QA-only £49 one-time price." }, 409);

    const [order] = await query<{ id: string; status: string; payment_reference: string | null; agreement_version: string; agreement_accepted_at: string }>(
      "SELECT id, status, payment_reference, agreement_version, agreement_accepted_at FROM commissioned_guide_orders WHERE checkout_session_id=$1 AND owner_id=$2 AND property_id=$3",
      [session.id, host.user.id, metadata.property_id],
    );
    if (!order || order.agreement_version !== metadata.agreement_version ||
        new Date(order.agreement_accepted_at).getTime() !== new Date(metadata.agreement_accepted_at).getTime())
      return reply({ error: "Matching owner-approved QA agreement record was not found." }, 409);
    if (order.status === "cancelled" || order.status === "refunded")
      return reply({ error: "Cancelled or refunded orders cannot be fulfilled." }, 409);

    const [property] = await query<{ id: string; status: string; published_at: string | null }>(
      "SELECT id, status, published_at FROM properties WHERE id=$1 AND owner_id=$2",
      [metadata.property_id, host.user.id],
    );
    if (!property || property.status !== "published" || !property.published_at)
      return reply({ error: "Publish the approved guide before activating its hosting term." }, 409);

    const results = await transaction([
      { text: "SELECT id, status, payment_reference FROM commissioned_guide_orders WHERE id=$1 AND owner_id=$2 FOR UPDATE", params: [order.id, host.user.id] },
      { text: "INSERT INTO commissioned_guide_hosting (property_id, owner_id, payment_reference, agreement_version, agreement_accepted_at, payment_verified_at, published_at, starts_at, ends_at) SELECT p.id, p.owner_id, $3, $4, $5, now(), p.published_at, p.published_at, p.published_at + interval '12 months' FROM properties p WHERE p.id=$1 AND p.owner_id=$2 AND p.status='published' AND p.published_at IS NOT NULL ON CONFLICT (property_id) DO NOTHING", params: [property.id, host.user.id, paymentIntentId, order.agreement_version, order.agreement_accepted_at] },
      { text: "SELECT payment_reference, status, starts_at, ends_at FROM commissioned_guide_hosting WHERE property_id=$1 AND owner_id=$2", params: [property.id, host.user.id] },
      { text: "UPDATE commissioned_guide_orders SET status='fulfilled', payment_reference=$2, updated_at=now() WHERE id=$1 AND owner_id=$3 AND status IN ('paid','fulfilled') AND (payment_reference IS NULL OR payment_reference=$2)", params: [order.id, paymentIntentId, host.user.id] },
    ]);
    const hosting = results[2]?.[0] as { payment_reference: string; status: string; starts_at: string; ends_at: string } | undefined;
    if (!hosting || hosting.payment_reference !== paymentIntentId || !results[3]?.length)
      return reply({ error: "Hosting was not activated because the order could not be safely reconciled." }, 409);
    return reply({ activated: true, idempotent: order.status === "fulfilled", startsAt: hosting.starts_at, endsAt: hosting.ends_at, status: hosting.status });
  } catch {
    return reply({ error: "QA payment verification or fulfilment failed. No subscription or premium entitlement was granted." }, 502);
  }
}
