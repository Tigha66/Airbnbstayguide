/** One-time operator catalogue preparation; never creates subscriptions or charges.
 * Disabled by default. Restricted to the reviewed StayGuide live account.
 */
const expectedAccount = "acct_1Rdzf0G3wnn7CPRM";
if (process.env.STAYGUIDE_PREPARE_MANAGER_CATALOGUE === expectedAccount) {
  try {
  if (process.env.VERCEL_ENV !== "preview") throw new Error("Operator catalogue preparation requires Preview");
  const { stripeClient, stripeLiveMode, lookupKey } = await import("../lib/stripe");
  const { plans, CURRENCY } = await import("@stayguide/shared");
  if (!stripeLiveMode()) throw new Error("Operator catalogue preparation requires the reviewed live account");
  const stripe = stripeClient();
  const account = await stripe.accounts.retrieve();
  if (account.id !== expectedAccount) throw new Error("Wrong Stripe account; no catalogue changes made");
  const products = await stripe.products.search({ query: "metadata['app']:'stayguide' AND metadata['plan']:'manager'", limit: 10 });
  const product = products.data.find(item => item.active) ?? await stripe.products.create({
    name: "StayGuide Manager",
    description: "Flat-rate portfolio subscription for up to 50 properties, with unified inbox and guest concierge.",
    metadata: { app: "stayguide", plan: "manager" },
  }, { idempotencyKey: "stayguide:manager:product:v1" });
  for (const yearly of [false, true]) {
    const lookup = lookupKey("manager", yearly);
    const amount = plans.manager.monthly * 100 * (yearly ? 10 : 1);
    const interval = yearly ? "year" : "month";
    const existing = await stripe.prices.list({ active: true, lookup_keys: [lookup], limit: 1 });
    const price = existing.data[0] ?? await stripe.prices.create({
      product: product.id, currency: CURRENCY, unit_amount: amount,
      recurring: { interval }, lookup_key: lookup,
      metadata: { app: "stayguide", plan: "manager" },
    }, { idempotencyKey: `stayguide:manager:price:${interval}:usd:${amount}:v1` });
    if (price.unit_amount !== amount || price.currency !== CURRENCY ||
        price.recurring?.interval !== interval || price.recurring.interval_count !== 1)
      throw new Error("Existing Manager price does not match reviewed terms; no existing prices changed");
    console.log("STAYGUIDE_MANAGER_CATALOGUE " + JSON.stringify({ id: price.id, lookup, amount, currency: price.currency, interval }));
  }
  } catch {
    throw new Error("Manager catalogue preparation stopped; verify account, permissions and reviewed prices. Provider details redacted.");
  }
} else {
  console.log("Operator Manager catalogue preparation disabled");
}
