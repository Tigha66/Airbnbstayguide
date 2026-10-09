import { query } from "./db";

/** Guest chat messages are kept for 12 months. */
export const CHAT_RETENTION = "12 months";
/** Guest names, contact details and notes on extra requests are kept for 6 months. */
export const GUEST_CONTACT_RETENTION = "6 months";

export type RetentionResult = { chatMessagesDeleted: number; extraRequestsAnonymised: number; stripeEventsDeleted: number };

const count = async (sql: string) => Number((await query<{ n: number | string }>(sql))[0]?.n ?? 0);

/**
 * Data retention, run daily by the Vercel cron (/api/cron/retention). Deletes old guest chats,
 * clears guest contact fields on old extra requests (the request itself stays for the host's
 * records and payouts), and forgets processed Stripe webhook ids after 90 days.
 */
export async function runRetention(): Promise<RetentionResult> {
  const chatMessagesDeleted = await count(
    `WITH d AS (DELETE FROM chat_messages WHERE created_at < now() - interval '${CHAT_RETENTION}' RETURNING 1) SELECT count(*) AS n FROM d`,
  );
  const extraRequestsAnonymised = await count(
    `WITH u AS (UPDATE extra_requests SET guest_name = '', guest_contact = '', note = ''
       WHERE created_at < now() - interval '${GUEST_CONTACT_RETENTION}' AND (guest_name <> '' OR guest_contact <> '' OR note <> '')
       RETURNING 1) SELECT count(*) AS n FROM u`,
  );
  const stripeEventsDeleted = await count(
    `WITH d AS (DELETE FROM stripe_events WHERE received_at < now() - interval '90 days' RETURNING 1) SELECT count(*) AS n FROM d`,
  );
  await query(`DELETE FROM rate_limits WHERE window_start < now() - interval '25 hours'`);
  return { chatMessagesDeleted, extraRequestsAnonymised, stripeEventsDeleted };
}

/** Constant-time check of the `Authorization: Bearer <CRON_SECRET>` header Vercel Cron sends. */
export function cronAuthorized(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
