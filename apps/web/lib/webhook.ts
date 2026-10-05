import type Stripe from "stripe";
export function subscriptionRecord(event: Stripe.Event) {
  if (
    ![
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    return null;
  const sub = event.data.object as Stripe.Subscription;
  const item = sub.items.data[0];
  const organization = sub.metadata.organization_id;
  if (!organization || !["starter", "pro"].includes(sub.metadata.plan))
    throw new Error("Subscription metadata missing");
  return {
    organization_id: organization,
    stripe_subscription_id: sub.id,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    plan:
      sub.status === "active" || sub.status === "trialing"
        ? sub.metadata.plan
        : "free",
    status: sub.status,
    quantity: item?.quantity || 1,
    current_period_end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  };
}
