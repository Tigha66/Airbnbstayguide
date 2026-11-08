/** Opt-in, read-only configuration diagnostics in the deployment environment.
 * No charges, account creation, email sends, migrations or customer output.
 * This reports configuration only and never certifies live acceptance.
 */
if (process.env.STAYGUIDE_PREVIEW_PREFLIGHT === "1") {
  if (process.env.VERCEL_ENV !== "preview")
    throw new Error("Build-time billing diagnostics are Preview-only");
  try {
    const { billingPreflight } = await import("../lib/billing-preflight");
    const report = await billingPreflight();
    console.log("STAYGUIDE_PREFLIGHT " + JSON.stringify(report));
    // Safe operator inventory: domain names and price configuration only.
    // This never logs API keys, customer records or raw provider exceptions.
    const { stripeClient, stripeConfigured, lookupKey } = await import("../lib/stripe");
    if (stripeConfigured()) {
      for (const plan of ["starter", "pro", "manager"] as const) {
        for (const yearly of [false, true]) {
          const key = "STRIPE_PRICE_" + plan.toUpperCase() + "_" + (yearly ? "YEAR" : "MONTH");
          const configured = process.env[key]?.trim();
          let configuredExists: boolean | null = null;
          if (configured) {
            try { await stripeClient().prices.retrieve(configured); configuredExists = true; }
            catch { configuredExists = false; }
          }
          const prices = await stripeClient().prices.list({ active: true, lookup_keys: [lookupKey(plan, yearly)], limit: 1 });
          console.log("STAYGUIDE_PRICE " + JSON.stringify({
            key, configured: Boolean(configured), configuredExists,
            catalogue: prices.data.map(price => ({
              id: price.id, currency: price.currency, amount: price.unit_amount,
              interval: price.recurring?.interval, intervalCount: price.recurring?.interval_count,
            })),
          }));
        }
      }
      const account = await stripeClient().accounts.retrieve();
      console.log("STAYGUIDE_STRIPE_ACCOUNT " + JSON.stringify({ id: account.id, chargesEnabled: account.charges_enabled }));
      const catalogue = await stripeClient().prices.list({ active: true, limit: 100, expand: ["data.product"] });
      console.log("STAYGUIDE_CATALOGUE " + JSON.stringify({
        prices: catalogue.data.filter(price => {
          const product = typeof price.product === "object" && !price.product.deleted ? price.product : null;
          return price.lookup_key?.startsWith("stayguide_") || price.metadata?.app === "stayguide" ||
            product?.metadata?.app === "stayguide" || product?.name?.startsWith("StayGuide");
        }).map(price => ({ id: price.id, lookup: price.lookup_key, amount: price.unit_amount,
          currency: price.currency, interval: price.recurring?.interval, intervalCount: price.recurring?.interval_count })),
        hasMore: catalogue.has_more,
      }));
    }
    const emailKey = process.env.RESEND_API_KEY || process.env.RESENDAPIKEY;
    if (emailKey) {
      const response = await fetch("https://api.resend.com/domains?limit=100", {
        headers: { Authorization: `Bearer ${emailKey}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) {
        const body = await response.json() as { data?: { name?: string; status?: string; capabilities?: { sending?: string } }[]; has_more?: boolean };
        console.log("STAYGUIDE_SENDER_DOMAINS " + JSON.stringify({
          verified: Array.isArray(body.data) ? body.data.filter(domain => domain.status === "verified" && domain.capabilities?.sending !== "disabled").map(domain => domain.name) : [],
          hasMore: Boolean(body.has_more),
        }));
      }
    }
  } catch {
    // Never print raw provider errors, URLs, headers or credentials.
    console.log("STAYGUIDE_PREFLIGHT " + JSON.stringify({
      kind: "configuration-only", configurationReady: false,
      error: "Read-only diagnostics unavailable; inspect the authenticated owner readiness page.",
    }));
  }
} else {
  console.log("Read-only billing build diagnostics disabled");
}
