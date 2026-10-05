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

/** Keeps the subscription quantity equal to the host's property count (min 1). Never throws. */
export async function syncSubscriptionQuantity(userId: string) {
  if (!stripeConfigured()) return;
  try {
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
  } catch (error) {
    console.error("[billing] quantity sync failed", error);
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
