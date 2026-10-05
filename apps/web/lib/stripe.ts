import Stripe from "stripe";
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("Stripe is not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
export function resolvePrice(plan: string, annual: boolean) {
  if (!["starter", "pro"].includes(plan)) throw new Error("Invalid plan");
  const key = `STRIPE_${plan.toUpperCase()}_${annual ? "YEARLY" : "MONTHLY"}_PRICE_ID`;
  const price = process.env[key];
  if (!price) throw new Error("Price not configured");
  return price;
}
