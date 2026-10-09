import { stripeClient, stripeConfigured, billableQuantity, isMissing } from "./stripe";
import { clearStripeAccount, clearStripeCustomer, getBilling, setStripeAccount, setStripeCustomer, type User } from "./repo";

export async function ensureCustomer(user: User) {
  const billing = await getBilling(user.id);
  if (billing?.stripeCustomerId) {
    try {
      const existing = await stripeClient().customers.retrieve(billing.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) return billing.stripeCustomerId;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    await clearStripeCustomer(user.id);
  }
  const customer = await stripeClient().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { app: "stayguide", user_id: user.id },
  });
  await setStripeCustomer(user.id, customer.id);
  return customer.id;
}

async function syncQuantityOnce(userId: string) {
  const billing = await getBilling(userId);
  if (!billing?.stripeSubscriptionId) return;
  const stripe = stripeClient();
  const sub = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
  const item = sub.items.data[0];
  const quantity = billableQuantity(billing.propertyCount);
  if (item && item.quantity !== quantity && !["canceled", "incomplete_expired"].includes(sub.status))
    await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: "create_prorations",
    });
}

/**
 * Keeps the subscription quantity equal to the host's property count (min 1). Never throws.
 * Retries once on failure; if Stripe is still unreachable, the next subscription webhook
 * (renewal, invoice.upcoming) re-checks the count, so charges can't drift for long.
 */
export async function syncSubscriptionQuantity(userId: string) {
  if (!stripeConfigured()) return;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await syncQuantityOnce(userId);
      return;
    } catch (error) {
      if (attempt === 2) console.error("[billing] quantity sync failed", error);
      else await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

/**
 * Cancels the host's subscription immediately, before their account is deleted, so a deleted
 * account can never keep being charged. Throws if Stripe can't confirm the cancellation.
 */
export async function cancelSubscriptionForDeletion(userId: string) {
  if (!stripeConfigured()) return;
  const billing = await getBilling(userId);
  if (!billing?.stripeSubscriptionId || billing.subscriptionStatus === "canceled") return;
  try {
    await stripeClient().subscriptions.cancel(billing.stripeSubscriptionId);
  } catch (error) {
    // Already gone in Stripe (e.g. cancelled there, or test keys swapped): nothing left to charge.
    if (!isMissing(error)) throw error;
  }
}

/** Refreshes whether the host's Connect account can accept payments. */
export async function refreshPayoutStatus(userId: string, accountId: string | null) {
  if (!accountId || !stripeConfigured()) return false;
  try {
    const account = await stripeClient().accounts.retrieve(accountId);
    const ready = Boolean(account.charges_enabled && account.details_submitted);
    await setStripeAccount(userId, accountId, ready);
    return ready;
  } catch (error) {
    if (isMissing(error)) await clearStripeAccount(userId);
    return false;
  }
}
