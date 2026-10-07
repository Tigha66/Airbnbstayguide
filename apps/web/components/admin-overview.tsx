import Link from "next/link";
import { plans } from "@stayguide/shared";
import type { AdminHostRow } from "@/lib/repo";
import { Logo } from "./ui";

const PAYING = new Set(["active", "trialing", "past_due"]);
const statusLabel = (plan: string, status: string | null) =>
  plan === "free" ? "Free" : !status ? "Complimentary" : status === "past_due" ? "Payment failed (retrying)" : status === "trialing" ? "Trial" : status ? status[0].toUpperCase() + status.slice(1) : "Active";

/** Owner overview table (rendered by /admin after the owner check). */
export type AiHealth = { ok: boolean; provider: string; model: string; detail: string };
export function AdminOverview({ hosts, ai }: { hosts: AdminHostRow[]; ai?: AiHealth }) {
  const paying = hosts.filter((h) => h.plan !== "free" && PAYING.has(h.subscriptionStatus ?? ""));
  const paidProperties = paying.reduce((n, h) => n + h.properties, 0);
  const monthly = paying.reduce((n, h) => n + plans[h.plan].monthly * Math.max(1, h.properties), 0);
  const totals = [
    ["Hosts", hosts.length],
    ["Paying hosts", paying.length],
    ["Properties (all)", hosts.reduce((n, h) => n + h.properties, 0)],
    ["Paid properties", paidProperties],
    ["Est. monthly revenue", `£${monthly.toLocaleString("en-GB")}`],
    ["AI messages this month", hosts.reduce((n, h) => n + h.aiMessagesThisMonth, 0).toLocaleString("en-GB")],
  ] as const;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Logo />
        <div className="row">
          <span className="demo-badge">OWNER ONLY</span>
          <Link className="button secondary small" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </header>
      <div className="page-heading">
        <div>
          <div className="eyebrow">STAYGUIDE OWNER</div>
          <h1>Your hosts</h1>
          <p>Every host account, their plan, properties and usage. Read-only.</p>
        </div>
      </div>
      {ai && (
        <div className={`card admin-health ${ai.ok ? "ok" : "bad"}`} role="status">
          <strong>{ai.ok ? "AI concierge is working" : "AI concierge is NOT working: guests get keyword answers"}</strong>
          <small>
            Provider: {ai.provider} · Model: {ai.model || "—"} · {ai.detail}
          </small>
        </div>
      )}
      <div className="stats-grid admin-stats">
        {totals.map(([label, value]) => (
          <div className="card stat-card" key={label}>
            <div className="stat-top">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Host</th>
              <th>Plan</th>
              <th>Billing</th>
              <th className="num">Properties</th>
              <th className="num">Published</th>
              <th className="num">Monthly (£)</th>
              <th className="num">AI messages (month)</th>
              <th className="num">Guest questions (30 days)</th>
              <th>Payouts</th>
              <th>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {hosts.length === 0 && (
              <tr>
                <td colSpan={10} className="muted">No hosts yet.</td>
              </tr>
            )}
            {hosts.map((h) => {
              const isPaying = h.plan !== "free" && PAYING.has(h.subscriptionStatus ?? "");
              const nearLimit = h.aiMessagesThisMonth >= h.aiMessageLimit * 0.8;
              return (
                <tr key={h.email}>
                  <td>
                    <strong>{h.name || h.email.split("@")[0]}</strong>
                    <small>{h.email}</small>
                  </td>
                  <td>{plans[h.plan].name}</td>
                  <td>
                    <span className={`pill ${h.subscriptionStatus === "past_due" || (h.plan !== "free" && h.subscriptionStatus && !isPaying) ? "amber" : ""}`}>
                      {statusLabel(h.plan, h.subscriptionStatus)}
                    </span>
                  </td>
                  <td className="num">{h.properties}</td>
                  <td className="num">{h.published}</td>
                  <td className="num">{isPaying ? `£${plans[h.plan].monthly * Math.max(1, h.properties)}` : "—"}</td>
                  <td className={`num ${nearLimit ? "warn" : ""}`}>
                    {h.aiMessagesThisMonth.toLocaleString("en-GB")} / {h.aiMessageLimit.toLocaleString("en-GB")}
                  </td>
                  <td className="num">{h.guestQuestions30d.toLocaleString("en-GB")}</td>
                  <td>{h.payoutsReady ? "Ready" : "—"}</td>
                  <td>{h.signedUp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted admin-note">
        Monthly revenue is an estimate at monthly prices (yearly plans are billed 10× once a year). Stripe is the
        source of truth for payments: dashboard.stripe.com → Billing → Subscriptions.
      </p>
    </main>
  );
}
