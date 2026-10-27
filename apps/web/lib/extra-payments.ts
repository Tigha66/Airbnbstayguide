import type Stripe from "stripe";

export type ExtraAction = "approved" | "declined" | "paid" | "refunded";
export type OnlineExtra = { id: string; status: string; payment_intent_id: string | null; price: number };
type Provider = Pick<Stripe, "paymentIntents" | "refunds">;

export class ExtraPaymentConflict extends Error {}

/** Recover a completed provider operation when the previous DB save or response failed. */
export async function applyOnlineExtraAction(stripe: Provider, request: OnlineExtra, action: ExtraAction): Promise<ExtraAction> {
  const piId = request.payment_intent_id;
  if (!piId) throw new ExtraPaymentConflict("This request has no online payment.");
  if (request.status === action || (request.status === "paid" && action === "approved")) return request.status as ExtraAction;
  const capture = request.status === "pending" && action === "approved";
  const cancel = request.status === "pending" && action === "declined";
  const refund = request.status === "paid" && action === "refunded";
  if (!capture && !cancel && !refund) throw new ExtraPaymentConflict("That change is not possible for this paid request.");
  const pi = await stripe.paymentIntents.retrieve(piId);
  if (pi.metadata.app !== "stayguide" || pi.metadata.extra_request_id !== request.id || pi.amount !== request.price || pi.currency !== "usd")
    throw new ExtraPaymentConflict("The payment does not match this extra request. Contact support.");
  const idempotencyKey = `stayguide:extra:${request.id}:${action}`;
  if (capture) {
    if (pi.status === "succeeded") return "paid";
    if (pi.status !== "requires_capture") throw new ExtraPaymentConflict("This card hold cannot be captured. Refresh or contact the guest.");
    const captured = await stripe.paymentIntents.capture(piId, {}, { idempotencyKey });
    if (captured.status !== "succeeded") throw new ExtraPaymentConflict("Payment is still processing. Refresh before continuing.");
    return "paid";
  }
  if (cancel) {
    if (pi.status === "canceled") return "declined";
    if (pi.status !== "requires_capture") throw new ExtraPaymentConflict("The payment cannot be released. Refresh before continuing.");
    const canceled = await stripe.paymentIntents.cancel(piId, {}, { idempotencyKey });
    if (canceled.status !== "canceled") throw new ExtraPaymentConflict("The hold release is still processing.");
    return "declined";
  }
  if (pi.status !== "succeeded" || !pi.latest_charge) throw new ExtraPaymentConflict("This payment cannot be refunded yet.");
  const refunds = await stripe.refunds.list({ payment_intent: piId, limit: 100 });
  if (refunds.has_more) throw new ExtraPaymentConflict("This payment's refund history needs support review.");
  const refunded = refunds.data.filter(r => r.status === "succeeded").reduce((sum, r) => sum + r.amount, 0);
  if (refunded >= pi.amount) return "refunded";
  if (refunds.data.some(r => r.status === "pending" || r.status === "requires_action"))
    throw new ExtraPaymentConflict("A refund is already processing. Retry later to check its result.");
  const result = await stripe.refunds.create({
    payment_intent: piId, reverse_transfer: true, refund_application_fee: true,
    metadata: { app: "stayguide", extra_request_id: request.id },
  }, { idempotencyKey });
  if (result.status !== "succeeded") throw new ExtraPaymentConflict("The refund is still processing. Retry later to check its result.");
  return "refunded";
}
