import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyExtraDecision } from "@/lib/notify";
import { canChangeManualExtra } from "@/lib/extras";
import { requireHost } from "@/lib/session";
import { getOwnedExtraRequest, setExtraRequestStatus } from "@/lib/repo";
import { parseJsonOrNull, safeOrigin } from "@/lib/api";
import { stripeClient } from "@/lib/stripe";
const schema = z.object({ status: z.enum(["approved", "declined", "paid", "refunded"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  const parsed = schema.safeParse(parseJsonOrNull(await request.text()));
  if (!parsed.success || !z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const req = await getOwnedExtraRequest(host.user.id, id);
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  let status = parsed.data.status;
  if (req.payment_intent_id) {
    // Paid online: move the money with Stripe rather than just changing a label.
    const stripe = stripeClient();
    try {
      if (req.status === "pending" && status === "approved") {
        await stripe.paymentIntents.capture(req.payment_intent_id);
        status = "paid";
      } else if (req.status === "pending" && status === "declined") {
        await stripe.paymentIntents.cancel(req.payment_intent_id);
      } else if (req.status === "paid" && status === "refunded") {
        await stripe.refunds.create({ payment_intent: req.payment_intent_id, reverse_transfer: true, refund_application_fee: true });
      } else return NextResponse.json({ error: "That change isn’t possible for a paid request." }, { status: 409 });
    } catch (error) {
      console.error("[extras] payment update failed", error);
      return NextResponse.json({ error: "Stripe couldn’t process this. The hold may have expired; please contact the guest." }, { status: 502 });
    }
  } else {
    // Paid outside Stripe (cash, transfer…): pending → approved | declined, approved → paid.
    if (status === "refunded") return NextResponse.json({ error: "Only online payments can be refunded here." }, { status: 409 });
    if (!canChangeManualExtra(req.status, status))
      return NextResponse.json({ error: `A ${req.status} request can't be marked ${status}.` }, { status: 409 });
  }
  await setExtraRequestStatus(host.user.id, id, status);
  // Let the guest know (if they left an email address) when the host approves or declines.
  if (req.status === "pending" && (status === "approved" || status === "declined" || (status === "paid" && req.payment_intent_id)))
    await notifyExtraDecision(host.user.id, id, status !== "declined").catch(() => false);
  return NextResponse.json({ status });
}
