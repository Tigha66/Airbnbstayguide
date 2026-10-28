import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import { managerAccessSql } from "./manager-access";
import { nextAllowedLocalTime } from "./guest-automations";

export const outboxDraftSchema = z.object({
  propertyId: z.string().min(1).max(80),
  connectionId: z.string().uuid(),
  reservationId: z.string().regex(/^[\w-]{1,150}$/),
  conversationId: z.string().regex(/^[\w-]{1,150}$/),
  body: z.string().trim().min(1).max(2000),
  scheduledAt: z.iso.datetime({ offset: true }),
  timeZone: z.string().min(1).max(80),
  idempotencyKey: z.string().uuid(),
}).strict();
export type OutboxDraft = z.infer<typeof outboxDraftSchema>;
export type OutboxMessage = {
  id: string; ownerId: string; propertyId: string; connectionId: string;
  reservationId: string; conversationId: string; body: string;
  scheduledAt: string; timeZone: string; contentHash: string;
  status: "draft" | "approved" | "sending" | "sent" | "cancelled" | "failed" | "unknown";
  attempts: number; lastError: string | null; providerMessageId: string | null;
};
const columns = `m.id, m.owner_id AS "ownerId", m.property_id AS "propertyId",
  m.connection_id AS "connectionId", m.reservation_id AS "reservationId",
  m.conversation_id AS "conversationId", m.body, m.scheduled_at AS "scheduledAt",
  m.time_zone AS "timeZone", m.content_hash AS "contentHash", m.status, m.attempts,
  m.last_error AS "lastError", m.provider_message_id AS "providerMessageId"`;

export function draftHash(draft: Omit<OutboxDraft, "idempotencyKey">) {
  return createHash("sha256").update(JSON.stringify([
    draft.propertyId, draft.connectionId, draft.reservationId, draft.conversationId,
    draft.body, new Date(draft.scheduledAt).toISOString(), draft.timeZone,
  ])).digest("hex");
}

export async function listOutbox(ownerId: string) {
  return query<OutboxMessage>(`SELECT ${columns} FROM pms_outbox m
    WHERE m.owner_id = $1 ORDER BY m.created_at DESC LIMIT 100`, [ownerId]);
}

/** Only a connection provisioned by an authorised provider callback can supply
 * mappings. Browser IDs never establish property or provider ownership. */
export async function createOutboxDraft(ownerId: string, input: unknown, nowMs = Date.now()) {
  const data = outboxDraftSchema.parse(input);
  const at = Date.parse(data.scheduledAt);
  if (at < nowMs || at > nowMs + 90 * 86400000) throw new Error("Schedule must be within the next 90 days");
  // Also validates the IANA time zone; no server-local date interpretation.
  nextAllowedLocalTime(at, data.timeZone);
  const hash = draftHash(data);
  const [row] = await query<OutboxMessage>(`INSERT INTO pms_outbox AS m
    (owner_id, property_id, connection_id, reservation_id, conversation_id, body,
     scheduled_at, time_zone, content_hash, idempotency_key)
    SELECT u.id, p.id, c.id, $4, $5, $6, $7, $8, $9, $10
    FROM users u JOIN properties p ON p.owner_id = u.id AND p.id = $2
    JOIN pms_connections c ON c.owner_id = u.id AND c.id = $3 AND c.status = 'verified'
    JOIN pms_property_links l ON l.connection_id = c.id AND l.property_id = p.id
    WHERE u.id = $1 AND ${managerAccessSql()}
    ON CONFLICT (owner_id, idempotency_key) DO UPDATE SET idempotency_key = m.idempotency_key
      WHERE m.content_hash = EXCLUDED.content_hash
    RETURNING ${columns}`, [ownerId, data.propertyId, data.connectionId,
    data.reservationId, data.conversationId, data.body, new Date(at).toISOString(), data.timeZone, hash, data.idempotencyKey]);
  return row ?? null;
}

/** Approval is bound to the exact immutable content, recipient and schedule.
 * Cancellation is the only way to change content; create a new reviewed draft. */
export async function approveOutbox(ownerId: string, id: string, contentHash: string) {
  const [rows] = await transaction([
    { text: `UPDATE pms_outbox m SET status = 'approved', approved_at = now(), approved_hash = content_hash
      FROM users u, pms_connections c WHERE m.id = $2 AND m.owner_id = $1
      AND u.id = m.owner_id AND ${managerAccessSql()}
      AND c.id = m.connection_id AND c.owner_id = u.id AND c.status = 'verified'
      AND m.status = 'draft' AND m.content_hash = $3 AND m.scheduled_at > now()
      RETURNING m.id`, params: [ownerId, id, contentHash] },
    { text: `INSERT INTO pms_delivery_audit (message_id, action)
      SELECT id, 'approved' FROM pms_outbox WHERE id = $2 AND owner_id = $1
      AND status = 'approved' AND approved_hash = $3
      ON CONFLICT (message_id, action) DO NOTHING`, params: [ownerId, id, contentHash] },
  ]);
  return rows.length > 0;
}
export async function cancelOutbox(ownerId: string, id: string) {
  const [rows] = await transaction([
    { text: `UPDATE pms_outbox SET status = 'cancelled' WHERE owner_id = $1 AND id = $2
      AND status IN ('draft','approved','failed') RETURNING id`, params: [ownerId, id] },
    { text: `INSERT INTO pms_delivery_audit (message_id, action)
      SELECT id, 'cancelled' FROM pms_outbox WHERE owner_id = $1 AND id = $2 AND status = 'cancelled'
      ON CONFLICT (message_id, action) DO NOTHING`, params: [ownerId, id] },
  ]);
  return rows.length > 0;
}

/** Return operational metadata only; never credentials. No connect endpoint is
 * exposed until each provider's authorised OAuth onboarding is implemented. */
export async function listPmsConnections(ownerId: string) {
  return query<{ id: string; provider: string; status: string; paused: boolean }>(
    `SELECT id, provider, status, paused FROM pms_connections WHERE owner_id = $1 ORDER BY created_at`, [ownerId]);
}
export async function pausePmsConnection(ownerId: string, id: string, paused: boolean) {
  const rows = await query(`UPDATE pms_connections SET paused = $3
    WHERE owner_id = $1 AND id = $2 RETURNING id`, [ownerId, id, paused]);
  return rows.length > 0;
}

export type DeliveryContext = {
  ownerId: string; propertyId: string; connectionId: string;
  providerAccountId: string; externalPropertyId: string;
  reservationId: string; conversationId: string;
};
/** Implementations MUST fetch current provider data through this connection,
 * verify account/property/recipient, reservation dates/status, opt-out and manual
 * takeover before returning true. No webhook payload may establish these facts. */
export interface PmsDeliveryAdapter {
  verify(context: DeliveryContext): Promise<boolean>;
  send(context: DeliveryContext, body: string, idempotencyKey: string): Promise<{ messageId: string }>;
}
export class PmsSendError extends Error {
  constructor(public readonly outcome: "rejected" | "retryable" | "unknown") { super(outcome); }
}

type Claimed = OutboxMessage & { leaseToken: string; provider: string; providerAccountId: string; externalPropertyId: string };

/** No adapter means no claims and no network calls. A registered adapter is a
 * server capability, never chosen or supplied by the browser. */
export async function deliverPmsBatch(adapters: Readonly<Record<string, PmsDeliveryAdapter>>, limit = 10) {
  if (process.env.STAYGUIDE_PMS_DELIVERY_ENABLED !== "true" || !Object.keys(adapters).length) return { enabled: false, processed: 0 };
  const boundedLimit = Math.max(1, Math.min(20, Math.floor(limit) || 1));
  // A crashed send may have reached the provider. Quarantine; never auto-retry.
  await query(`UPDATE pms_outbox SET status = 'unknown', last_error = 'delivery_outcome_unknown'
    WHERE status = 'sending' AND claimed_at < now() - interval '10 minutes'`);
  const leaseToken = randomUUID();
  const messages = await query<Claimed>(`WITH candidates AS (
    SELECT m.id FROM pms_outbox m JOIN users u ON u.id = m.owner_id
    JOIN pms_connections c ON c.id = m.connection_id AND c.owner_id = u.id
    JOIN pms_property_links l ON l.connection_id = c.id AND l.property_id = m.property_id
    JOIN properties p ON p.id = l.property_id AND p.owner_id = u.id
    WHERE m.status = 'approved' AND m.scheduled_at <= now()
      AND m.scheduled_at > now() - interval '24 hours' AND m.available_at <= now()
      AND m.content_hash = m.approved_hash AND ${managerAccessSql()}
      AND c.status = 'verified' AND NOT c.paused AND c.delivery_enabled
      AND c.provider = ANY($3::text[]) AND m.attempts < 3
    ORDER BY m.scheduled_at LIMIT $1 FOR UPDATE OF m SKIP LOCKED
  ) UPDATE pms_outbox m SET status = 'sending', lease_token = $2, claimed_at = now(), attempts = attempts + 1
    FROM candidates t, pms_connections c, pms_property_links l
    WHERE m.id = t.id AND c.id = m.connection_id AND l.connection_id = c.id AND l.property_id = m.property_id
    RETURNING ${columns}, m.lease_token AS "leaseToken", c.provider,
      c.provider_account_id AS "providerAccountId", l.external_property_id AS "externalPropertyId"`,
  [boundedLimit, leaseToken, Object.keys(adapters)]);
  for (const message of messages) {
    const finish = async (status: string, error: string | null, providerMessageId: string | null = null) => {
      await transaction([
        { text: `UPDATE pms_outbox SET status = $3, last_error = $4, provider_message_id = $5
          WHERE id = $1 AND lease_token = $2 AND status = 'sending'`, params: [message.id, leaseToken, status, error, providerMessageId] },
        { text: `INSERT INTO pms_delivery_audit (message_id, action)
          SELECT id, $3 FROM pms_outbox WHERE id = $1 AND lease_token = $2 AND status = $3
          ON CONFLICT (message_id, action) DO NOTHING`, params: [message.id, leaseToken, status] },
      ]);
    };
    try {
      const allowed = nextAllowedLocalTime(Date.now(), message.timeZone);
      if (allowed > Date.now() + 1000) {
        // Defer execution without changing the approved schedule/hash.
        await query(`UPDATE pms_outbox SET status = 'approved', attempts = attempts - 1,
          available_at = $3 WHERE id = $1 AND lease_token = $2 AND status = 'sending'`, [message.id, leaseToken, new Date(allowed).toISOString()]);
        continue;
      }
      const adapter = adapters[message.provider];
      if (!await adapter.verify(message)) { await finish("cancelled", "reservation_or_recipient_not_eligible"); continue; }
      // Recheck local authority after slow network verification, immediately
      // before the send. A concurrent pause prevents subsequent dispatches.
      const [eligible] = await query(`SELECT m.id FROM pms_outbox m
        JOIN pms_connections c ON c.id = m.connection_id AND c.owner_id = m.owner_id
        JOIN properties p ON p.id = m.property_id AND p.owner_id = m.owner_id
        JOIN pms_property_links l ON l.connection_id = c.id AND l.property_id = p.id
        JOIN users u ON u.id = m.owner_id WHERE m.id = $1 AND m.lease_token = $2
        AND m.status = 'sending' AND m.content_hash = m.approved_hash
        AND c.status = 'verified' AND NOT c.paused AND c.delivery_enabled
        AND ${managerAccessSql()}`, [message.id, leaseToken]);
      if (!eligible || process.env.STAYGUIDE_PMS_DELIVERY_ENABLED !== "true") { await finish("cancelled", "delivery_paused_or_access_revoked"); continue; }
      if (nextAllowedLocalTime(Date.now(), message.timeZone) > Date.now() + 1000) {
        await finish("approved", "deferred_for_quiet_hours"); continue;
      }
      let receipt: { messageId: string };
      try { receipt = await adapter.send(message, message.body, message.id); }
      catch (error) {
        // Only an adapter's explicit pre-delivery rejection is safe to retry.
        // Timeouts, 5xx, unexpected payloads and generic errors are ambiguous.
        if (error instanceof PmsSendError && error.outcome === "retryable" && message.attempts < 3) {
          await query(`UPDATE pms_outbox SET status = 'approved', last_error = 'provider_retry_later',
            available_at = now() + interval '5 minutes' WHERE id = $1 AND lease_token = $2 AND status = 'sending'`, [message.id, leaseToken]);
        } else await finish(error instanceof PmsSendError && error.outcome !== "unknown" ? "failed" : "unknown", "provider_delivery_unconfirmed");
        continue;
      }
      if (!receipt?.messageId || receipt.messageId.length > 200) { await finish("unknown", "provider_receipt_missing"); continue; }
      await finish("sent", null, receipt.messageId);
    } catch {
      // Verification/database errors before send are safe to hold for review.
      // Persistence after a send can also fail; stale lease quarantine prevents
      // automatic duplicates on the next worker invocation.
      await finish("unknown", "delivery_requires_review");
    }
  }
  return { enabled: true, processed: messages.length };
}
