import { query } from "./db";

/**
 * The $199 Manager product must never be sold automatically just because
 * Stripe price IDs exist. Operator sets this flag only after real database,
 * billing and authenticated acceptance have passed.
 */
export function managerCheckoutEnabled() {
  return process.env.STAYGUIDE_MANAGER_CHECKOUT_ENABLED === "true";
}

/** Ensure the current database really has all Manager-required storage. */
export async function managerSchemaReady(): Promise<boolean> {
  try {
    const rows = await query<{ ready: boolean }>(
      `SELECT
        (to_regclass('public.portfolio_rules') IS NOT NULL
        AND to_regclass('public.portfolio_triage') IS NOT NULL
        AND to_regclass('public.portfolio_reply_templates') IS NOT NULL) AS ready`,
    );
    return rows[0]?.ready === true;
  } catch {
    return false;
  }
}
