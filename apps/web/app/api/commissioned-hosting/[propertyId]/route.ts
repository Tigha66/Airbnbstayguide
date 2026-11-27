import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { query } from "@/lib/db";
import { assertStripeAccountIdentity, stripeClient, stripeConfigured } from "@/lib/stripe";
import { getCommissionedGuideHosting } from "@/lib/commissioned-hosting";

export const dynamic = "force-dynamic";

/** Customer-visible, owner-scoped status only. This endpoint cannot issue or alter hosting. */
export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { propertyId } = await params;
  const status = await getCommissionedGuideHosting(host.user.id, propertyId);
  if (!status) return NextResponse.json({ error: "Hosting record not found." }, { status: 404 });

  let receiptUrl: string | null = null;
  let invoiceUrl: string | null = null;
  let invoicePdfUrl: string | null = null;
  const [order] = await query<{ checkoutSessionId: string }>(
    "SELECT checkout_session_id AS \"checkoutSessionId\" FROM commissioned_guide_orders WHERE property_id=$1 AND owner_id=$2 AND status IN ('fulfilled','refunded') ORDER BY created_at DESC LIMIT 1",
    [propertyId, host.user.id],
  );
  if (order && stripeConfigured()) {
    try {
      await assertStripeAccountIdentity();
      const stripe = stripeClient();
      const session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);
      const invoiceValue = session.invoice;
      const invoice = typeof invoiceValue === "string"
        ? await stripe.invoices.retrieve(invoiceValue)
        : invoiceValue;
      invoiceUrl = invoice?.hosted_invoice_url ?? null;
      invoicePdfUrl = invoice?.invoice_pdf ?? null;
      const paymentIntentValue = session.payment_intent;
      const paymentIntent = typeof paymentIntentValue === "string"
        ? await stripe.paymentIntents.retrieve(paymentIntentValue, { expand: ["latest_charge"] })
        : paymentIntentValue;
      const latestCharge = paymentIntent?.latest_charge;
      if (typeof latestCharge === "string")
        receiptUrl = (await stripe.charges.retrieve(latestCharge)).receipt_url ?? null;
      else
        receiptUrl = latestCharge?.receipt_url ?? null;
    } catch {
      // Keep hosting status available when the billing provider is temporarily unavailable.
    }
  }
  return NextResponse.json(
    { ...status, receiptUrl, invoiceUrl, invoicePdfUrl },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
