import { authConfigured } from "@/auth";
import { aiConfigured } from "@/lib/ai";
import { dbConfigured, query } from "@/lib/db";

export type ServiceStatus = { key: string; label: string; ok: boolean; detail: string };

/** Reports which live services are connected. Never exposes secret values. */
export async function serviceStatus(): Promise<ServiceStatus[]> {
  let dbOk = false;
  let dbDetail = "DATABASE_URL is not set: running in browser-only demo mode.";
  if (dbConfigured()) {
    try {
      await query("SELECT 1 FROM users LIMIT 1");
      dbOk = true;
      dbDetail = "Connected to Postgres; tables are in place.";
    } catch {
      dbDetail = "DATABASE_URL is set but the database could not be reached or is not migrated.";
    }
  }
  const auth = authConfigured() && dbOk;
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
  return [
    { key: "database", label: "Database (Neon)", ok: dbOk, detail: dbDetail },
    {
      key: "accounts",
      label: "Host accounts (Google login)",
      ok: auth,
      detail: auth ? "Hosts can sign in with Google." : "Needs AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET and a working database.",
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
      detail: stripe ? "Stripe key present." : "Not connected yet: subscriptions and paid extras are disabled.",
    },
  ];
}
