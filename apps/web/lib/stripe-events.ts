import type Stripe from "stripe";
import { planFromSubscription, priceOverride, stripeClient } from "./stripe";
import { applySubscription, extraRequestBySession, settleExtraCheckout, userIdForCustomer } from "./repo";
import { notifyExtraRequest, notifyPaymentFailed } from "./notify";
import { syncSubscriptionQuantity } from "./billing";

const customerId = (c: string | { id: string } | null) => (typeof c === "string" ? c : (c?.id ?? null));
const isOverridePrice = (id?: string) =>
  Boolean(id) && (["starter", "pro"] as const).some((p) => priceOverride(p, false) === id || priceOverride(p, true) === id);

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
        // Only the first delivery of this event changes the request (and emails the host).
        if (await settleExtraCheckout(session.id, status, piId)) {
          const request = await extraRequestBySession(session.id);
          if (request) await notifyExtraRequest({ ...request, paidOnline: true });
        }
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
      const isOurs = sub.metadata?.app === "stayguide" || sub.items.data.some((i) => i.price?.lookup_key?.startsWith("stayguide_") || isOverridePrice(i.price?.id));
      if (!isOurs) return "ignored";
      await syncSubscription(sub, event.type === "customer.subscription.deleted");
      // Self-heal: if an earlier quantity update failed, renewals and plan changes fix it here.
      if (event.type === "customer.subscription.updated") await resyncQuantity(customerId(sub.customer));
      return "subscription";
    }
    case "invoice.payment_failed": {
      // Refresh the plan status (e.g. past_due) from Stripe and ask the host to update their card.
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null; parent?: { subscription_details?: { subscription?: string | { id: string } } } | null };
      const subRef = invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? null;
      const subId = typeof subRef === "string" ? subRef : subRef?.id;
      if (!subId) return "ignored";
      const sub = await stripeClient().subscriptions.retrieve(subId);
      const isOurs = sub.metadata?.app === "stayguide" || sub.items.data.some((i) => i.price?.lookup_key?.startsWith("stayguide_") || isOverridePrice(i.price?.id));
      if (!isOurs) return "ignored";
      await syncSubscription(sub);
      const userId = await userIdForCustomer(customerId(sub.customer) ?? "");
      if (userId) await notifyPaymentFailed(userId);
      return "payment_failed";
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
