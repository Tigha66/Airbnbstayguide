import type Stripe from "stripe";
import { planFromSubscription, stripeClient } from "./stripe";
import { applySubscription, settleExtraCheckout, userIdForCustomer } from "./repo";
import { syncSubscriptionQuantity } from "./billing";

const customerId = (c: string | { id: string } | null) => (typeof c === "string" ? c : (c?.id ?? null));

async function syncSubscription(sub: Stripe.Subscription, deleted = false) {
  const customer = customerId(sub.customer);
  if (!customer) return;
  await applySubscription({
    customerId: customer,
    userId: sub.metadata?.user_id || undefined,
    subscriptionId: deleted ? null : sub.id,
    status: deleted ? "canceled" : sub.status,
    plan: deleted ? "free" : planFromSubscription(sub),
  });
}

async function resyncQuantity(customer: string | null) {
  const userId = customer ? await userIdForCustomer(customer) : null;
  if (userId) await syncSubscriptionQuantity(userId);
  return Boolean(userId);
}

/** Applies a verified Stripe event. Unrelated events (e.g. other products on the same account) are ignored. */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.app !== "stayguide") return "ignored";
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
        await syncSubscription(await stripeClient().subscriptions.retrieve(subId));
        return "subscription";
      }
      return "ignored";
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.app !== "stayguide" || session.metadata.kind !== "extra") return "ignored";
      await settleExtraCheckout(session.id, "expired", null);
      return "extra:expired";
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const isOurs = sub.metadata?.app === "stayguide" || sub.items.data.some((i) => i.price?.lookup_key?.startsWith("stayguide_"));
      if (!isOurs) return "ignored";
      await syncSubscription(sub, event.type === "customer.subscription.deleted");
      // Self-heal: if an earlier quantity update failed, renewals and plan changes fix it here.
      if (event.type === "customer.subscription.updated") await resyncQuantity(customerId(sub.customer));
      return "subscription";
    }
    case "invoice.upcoming": {
      // Sent a few days before each renewal (enable it on the webhook in Stripe): last chance to
      // make sure the next invoice charges for the right number of properties.
      const invoice = event.data.object as Stripe.Invoice;
      return (await resyncQuantity(customerId(invoice.customer))) ? "quantity" : "ignored";
    }
    default:
      return "ignored";
  }
}
