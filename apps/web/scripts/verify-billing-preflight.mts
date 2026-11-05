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
