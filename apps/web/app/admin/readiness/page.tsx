import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authConfigured } from "@/auth";
import { requireHost } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { billingPreflight } from "@/lib/billing-preflight";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Subscription launch checks | StayGuide", robots: { index: false, follow: false } };

/** A safe owner-facing launch checklist, not an instruction to switch on charges. */
export default async function Page() {
  if (!authConfigured()) notFound();
  const host = await requireHost();
  if ("response" in host) redirect("/login");
  if (!isAdminEmail(host.user.email)) notFound();
  const report = await billingPreflight();

  return (
    <main className="admin-page" style={{ paddingBottom: 72 }}>
      <header className="admin-header">
        <div><h1>Paid customer launch checks</h1><small>StayGuide owner only · read-only Stripe diagnostics</small></div>
        <Link className="button secondary small" href="/admin">Back to owner overview</Link>
      </header>
      <section className="card panel" style={{ marginBottom: 20 }}>
        <h2>{report.configurationReady ? "Configuration checks passed" : "Launch configuration needs attention"}</h2>
        <p>
          {report.configurationReady
            ? "The billing configuration looks complete, but real payments, email delivery, webhook processing and database recovery must still be tested before accepting paying customers."
            : "Fix the failed checks below before taking a first customer payment. No test on this page makes a charge, sends an email or changes a subscription."}
        </p>
        <p className="muted">Stripe: {report.stripeMode} · Environment: {report.environment}</p>
      </section>
      <section className="card panel" style={{ marginBottom: 20 }}>
        <h2>Payment and account configuration</h2>
        <div className="activity-list">
          {report.checks.map(check => (
            <div className="activity-item" key={check.key}>
              <span style={{ flex: 1 }}>
                <strong>{check.key.replaceAll("_", " ")}</strong>
                <small style={{ display: "block" }}>{check.detail}</small>
              </span>
              <span className={check.ok ? "pill" : "pill amber"}>{check.ok ? "Configured" : "Needs work"}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card panel">
        <h2>Release acceptance still required</h2>
        <p>These tests are deliberately not marked complete by a configuration check.</p>
        <ul>
          <li>One controlled live Checkout and matching Stripe webhook activation</li>
          <li>Failed-payment recovery, cancellation and refund acceptance</li>
          <li>Verification and password-reset email delivered to a real inbox</li>
          <li>Confirmed production Neon backup and restoration drill</li>
          <li>Connected Stripe account confirmed as the one used by this deployment</li>
        </ul>
        <p>
          <a href="https://dashboard.stripe.com/connect/accounts/overview" target="_blank" rel="noopener noreferrer">Complete Connect platform profile</a>
          {" · "}
          <a href="https://console.neon.tech/" target="_blank" rel="noopener noreferrer">Open Neon production database</a>
        </p>
        <p className="muted">Never share API keys in screenshots. Refresh this page after fixing provider configuration.</p>
      </section>
    </main>
  );
}
