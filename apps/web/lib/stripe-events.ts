import type Stripe from "stripe";
import { planFromSubscription, stripeClient, stripeLiveMode } from "./stripe";
import { query } from "./db";
import { applySubscription, settleExtraCheckout } from "./repo";

const customerId = (c: string | { id: string } | null) => (typeof c === "string" ? c : (c?.id ?? null));

async function syncSubscription(sub: Stripe.Subscription, deleted = false, eventCreated?: number) {
  const customer = customerId(sub.customer);
  if (!customer) return;
  await applySubscription({
    customerId: customer,
    userId: sub.metadata?.user_id || undefined,
    subscriptionId: deleted ? null : sub.id,
    status: deleted ? "canceled" : sub.status,
    plan: deleted ? "free" : planFromSubscription(sub),
    previousSubscriptionId: sub.id,
    eventCreated,
  });
}

/** Applies a verified Stripe event. Unrelated events (e.g. other products on the same account) are ignored. */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.app !== "stayguide") return "ignored";
      if (session.metadata.kind === "commissioned_hosting") {
        if (session.metadata.qa_only !== "true" || session.mode !== "payment" || session.payment_status !== "paid") return "ignored";
        const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (!piId || !session.metadata.user_id || !session.metadata.property_id) return "ignored";
        const pi = await stripeClient().paymentIntents.retrieve(piId);
        if (pi.status !== "succeeded" || pi.livemode !== stripeLiveMode() ||
            pi.metadata?.app !== "stayguide" || pi.metadata?.kind !== "commissioned_hosting" ||
            pi.metadata?.qa_only !== "true" || pi.metadata?.user_id !== session.metadata.user_id ||
            pi.metadata?.property_id !== session.metadata.property_id) return "ignored";
        await query(
          "UPDATE commissioned_guide_orders SET status='paid', payment_reference=$2, updated_at=now() WHERE checkout_session_id=$1 AND status='pending' AND (payment_reference IS NULL OR payment_reference=$2)",
          [session.id, piId],
        );
        return "commissioned_hosting:paid";
      }
      if (session.metadata.kind === "extra") {
        const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (!piId) return "ignored";
        const pi = await stripeClient().paymentIntents.retrieve(piId);
        const status = pi.status === "succeeded" ? "paid" : pi.status === "requires_capture" ? "pending" : null;
        if (!status) return "ignored";
        await settleExtraCheckout(session.id, status, piId);
        return `extra:${status}`;
      }
      if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await stripeClient().subscriptions.retrieve(subId), false, event.created);
        return "subscription";
      }
      return "ignored";
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.app !== "stayguide") return "ignored";
      if (session.metadata.kind === "commissioned_hosting" && session.metadata.qa_only === "true") {
        await query("UPDATE commissioned_guide_orders SET status='cancelled', updated_at=now() WHERE checkout_session_id=$1 AND status='pending'", [session.id]);
        return "commissioned_hosting:cancelled";
      }
      if (session.metadata.kind !== "extra") return "ignored";
      await settleExtraCheckout(session.id, "expired", null);
      return "extra:expired";
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const isOurs = sub.metadata?.app === "stayguide" || sub.items.data.some((i) => i.price?.lookup_key?.startsWith("stayguide_"));
      if (!isOurs) return "ignored";
      await syncSubscription(event.type === "customer.subscription.deleted" ? sub : await stripeClient().subscriptions.retrieve(sub.id), event.type === "customer.subscription.deleted", event.created);
      return "subscription";
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const reference = invoice.parent?.subscription_details?.subscription;
      const id = typeof reference === "string" ? reference : reference?.id;
      if (!id) return "ignored";
      const sub = await stripeClient().subscriptions.retrieve(id);
      if (sub.metadata?.app !== "stayguide") return "ignored";
      await syncSubscription(sub, false, event.created);
      return "subscription";
    }
    case "charge.refunded":
    case "charge.dispute.created":
    case "radar.early_fraud_warning.created": {
      const object = event.data.object as unknown as { id: string; charge?: string; customer?: string; payment_intent?: string | { id: string }; refunded?: boolean; amount?: number; amount_refunded?: number };
      const charge = event.type === "charge.refunded" ? object : object.charge ? await stripeClient().charges.retrieve(object.charge) : null;
      if (event.type === "charge.refunded" && charge?.refunded === true &&
          typeof charge.payment_intent === "string") {
        const paymentReference = charge.payment_intent;
        await query("UPDATE commissioned_guide_orders SET status='refunded', updated_at=now() WHERE payment_reference=$1 AND status IN ('paid','fulfilled')", [paymentReference]);
        await query("UPDATE commissioned_guide_hosting SET status='refunded' WHERE payment_reference=$1 AND status='active'", [paymentReference]);
      }
      const customer = typeof charge?.customer === "string" ? charge.customer : null;
      if (!customer) return "ignored";
      await query("INSERT INTO billing_alerts (event_id, user_id, event_type, object_id) SELECT $1, id, $2, $3 FROM users WHERE stripe_customer_id = $4 ON CONFLICT (event_id) DO NOTHING", [event.id, event.type, object.id, customer]);
      return "review-required";
    }
    default:
      return "ignored";
  }
}


/** Signature verification belongs in the route; successful handlers are recorded for safe retries. */
export async function handleVerifiedStripeEvent(event: Stripe.Event) {
  if (event.livemode !== stripeLiveMode()) throw new Error("Stripe webhook mode mismatch");
  if (!event.id || !Number.isFinite(event.created) || event.created <= 0) throw new Error("Invalid event");
  if ((await query("SELECT id FROM stripe_webhook_events WHERE id = $1", [event.id])).length) return "duplicate";
  const result = await handleStripeEvent(event);
  await query("INSERT INTO stripe_webhook_events (id, event_type, created) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [event.id, event.type, event.created]);
  return result;
}
