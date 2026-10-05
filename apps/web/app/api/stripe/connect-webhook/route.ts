import { unavailable } from "@/lib/api";
// Billing is being moved to the Neon backend. Until Stripe is configured and wired up,
// webhooks are rejected so Stripe retries them instead of silently dropping events.
export async function POST() {
  return unavailable("Billing");
}
