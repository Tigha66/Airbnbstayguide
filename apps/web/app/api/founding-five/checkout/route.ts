import { NextResponse } from "next/server";
import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { reserveFoundingFiveCustomer } from "@/lib/founding-five-reservations";
import { requireHost } from "@/lib/session";
import { appUrl, assertStripeAccountIdentity, checkoutIdentity, stripeClient, stripeConfigured, stripeLiveMode } from "@/lib/stripe";
import { parseJson, safeOrigin } from "@/lib/api";

export const dynamic = "force-dynamic";
const agreementVersion = "founding-five-qa-usd-v2";
const schema = z.object({
  propertyId: z.string().trim().min(1).max(80),
  qaAgreementAccepted: z.literal(true),
});
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

function qaCheckoutEnabled() {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.FOUNDING_FIVE_QA_ENABLED === "true" &&
    stripeConfigured() && !stripeLiveMode() &&
    Boolean(process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID) &&
    Boolean(process.env.STRIPE_EXPECTED_ACCOUNT_ID);
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
    await assertStripeAccountIdentity();
    const stripe = stripeClient();
    const configuredPriceId = process.env.STRIPE_FOUNDING_FIVE_QA_PRICE_ID!.trim();
    const price = await stripe.prices.retrieve(configuredPriceId);
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);
    if (!price.active || price.currency !== "usd" || price.unit_amount !== 4900 || price.recurring ||
        price.metadata?.qa_only !== "true" || product.metadata?.qa_only !== "true" ||
        product.metadata?.environment !== "test_mode_only")
      return reply({ error: "The configured Founding Five price is not the approved QA-only one-time $49 USD price." }, 503);

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
        await query("UPDATE founding_five_offer_reservations SET status='cancelled' WHERE checkout_session_id=$1 AND status='pending'", [existing.checkout_session_id]);
      } else {
        return reply({ error: "An existing QA checkout needs to finish or expire before another can start." }, 409);
      }
    } else if (existing) {
      return reply({ error: "This property already has a paid or fulfilled Founding Five order." }, 409);
    }

    const reservation = await reserveFoundingFiveCustomer(host.user.id, propertyId);
    if (!reservation.reserved) {
      if (reservation.reason === "duplicate")
        return reply({ error: "Founding Five is limited to one purchase per customer. This account already has an active or completed order." }, 409);
      return reply({ error: "All five Founding Five places are currently reserved or sold." }, 409);
    }

    const acceptedAt = new Date().toISOString();
    const identity = checkoutIdentity(`${host.user.id}:${propertyId}:${reservation.reservationId}`, price.id, 1);
    const qaOrigin = "https://stayguide-isolated-qa-git-test-founding-fi-6322a7-hajabdelhak66.vercel.app";
    const origin = request.headers.get("origin") === qaOrigin ? qaOrigin : appUrl(request);
    let createdSessionId: string | null = null;
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: host.user.email,
        customer_creation: "always",
        client_reference_id: host.user.id,
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: {
          app: "stayguide",
          kind: "commissioned_hosting",
          qa_only: "true",
          user_id: host.user.id,
          property_id: propertyId,
          reservation_id: reservation.reservationId,
          agreement_version: agreementVersion,
          agreement_accepted_at: acceptedAt,
          price_id: price.id,
        },
        automatic_tax: { enabled: false },
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: "Founding Five guest guide, one consolidated revision, and 12 months of basic hosting from publication.",
            footer: "Supplier is not VAT registered. No UK VAT charged.",
            metadata: {
              app: "stayguide",
              kind: "commissioned_hosting",
              qa_only: "true",
              user_id: host.user.id,
              property_id: propertyId,
              price_id: price.id,
            },
          },
        },
        custom_text: {
          submit: { message: "Supplier is not VAT registered. No UK VAT charged." },
        },
        payment_intent_data: {
          description: "Founding Five guide and 12 months basic hosting. Supplier is not VAT registered. No UK VAT charged.",
          metadata: {
            app: "stayguide",
            kind: "commissioned_hosting",
            qa_only: "true",
            vat_status: "not_registered_no_uk_vat_charged",
            user_id: host.user.id,
            property_id: propertyId,
          },
        },
        success_url: origin + "/dashboard/editor?foundingFive=payment-received&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: origin + "/dashboard/editor?foundingFive=cancelled",
      }, { idempotencyKey: identity.idempotencyKey });
      if (!session.url || !session.expires_at) throw new Error("Stripe returned an incomplete Checkout Session");
      createdSessionId = session.id;
      const saved = await transaction([{
        text: `
          WITH reserved AS (
            UPDATE founding_five_offer_reservations
            SET checkout_session_id=$2, expires_at=to_timestamp($3)
            WHERE id=$1 AND status='pending'
            RETURNING id
          )
          INSERT INTO commissioned_guide_orders
            (property_id, owner_id, checkout_session_id, agreement_version, agreement_accepted_at)
          SELECT $4,$5,$2,$6,$7 FROM reserved
          ON CONFLICT (checkout_session_id) DO NOTHING
          RETURNING id
        `,
        params: [reservation.reservationId, session.id, session.expires_at, propertyId, host.user.id, agreementVersion, acceptedAt],
      }]);
      if (!saved[0]?.length) throw new Error("Founding Five reservation could not be linked to checkout");
      return reply({ url: session.url });
    } catch (error) {
      if (createdSessionId) await stripe.checkout.sessions.expire(createdSessionId).catch(() => undefined);
      await query("UPDATE founding_five_offer_reservations SET status='cancelled' WHERE id=$1 AND status='pending'", [reservation.reservationId]).catch(() => undefined);
      throw error;
    }
  } catch {
    return reply({ error: "QA checkout could not be prepared. No hosting or paid subscription was granted." }, 502);
  }
}
