import { appleConfigured, authConfigured, googleConfigured } from "@/auth";
import { passwordLoginConfigured } from "./password-login";
import { aiConfigured } from "@/lib/ai";
import { dbConfigured, query } from "@/lib/db";
import { mailerConfigured } from "@/lib/mailer";

export type ServiceStatus = { key: string; label: string; ok: boolean; detail: string };

/** Reports which live services are connected. Never exposes secret values. */
export async function serviceStatus(): Promise<ServiceStatus[]> {
  let dbOk = false;
  let dbDetail = "DATABASE_URL is not set: running in browser-only demo mode.";
  if (dbConfigured()) {
    try {
      await query("SELECT id, session_version, billing_event_created FROM users LIMIT 1");
      dbOk = true;
      dbDetail = "Connected to Postgres; tables are in place.";
    } catch {
      dbDetail = "DATABASE_URL is set but the database could not be reached or is not migrated.";
    }
  }
  const auth = authConfigured() && dbOk;
  const authProviders = [
    googleConfigured() && "Google",
    appleConfigured() && "Apple",
    passwordLoginConfigured() && "email and password",
  ].filter(Boolean).join(", ");
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_") && process.env.STRIPE_WEBHOOK_SECRET);
  const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
  return [
    { key: "database", label: "Database (Neon)", ok: dbOk, detail: dbDetail },
    {
      key: "accounts",
      label: "Host accounts",
      ok: auth,
      detail: auth ? `Hosts can sign in with ${authProviders}.` : "Needs AUTH_SECRET, at least one login provider, and a working database.",
    },
    {
      key: "email",
      label: "Account email",
      ok: mailerConfigured(),
      detail: mailerConfigured() ? "Email provider configured; delivery has not been verified." : "Verification and password reset emails need RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM_EMAIL).",
    },
    {
      key: "ai",
      label: "AI concierge & guide builder",
      ok: aiConfigured(),
      detail: aiConfigured() ? "AI provider configured." : "Needs HF_TOKEN (Hugging Face). Guests get keyword answers from the guide meanwhile.",
    },
    {
      key: "payments",
      label: "Payments (Stripe)",
      ok: stripe,
      detail: stripe ? `Stripe configured (${mode} mode); checkout, webhooks and payouts still need end-to-end verification.` : "Not connected yet: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
    },
  ];
}
