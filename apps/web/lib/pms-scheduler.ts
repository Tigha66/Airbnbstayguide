import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { query } from "./db";
import { deliverPmsBatch, type PmsDeliveryAdapter } from "./pms-outbox";

export function cronAuthorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") ?? "";
  return timingSafeEqual(createHash("sha256").update(supplied).digest(),
    createHash("sha256").update(`Bearer ${secret}`).digest());
}

/** No fixture or browser-supplied adapter can enter the deployed worker.
 * Provider OAuth onboarding must register its tested server implementation here. */
export function deliveryAdapters(): Readonly<Record<string, PmsDeliveryAdapter>> { return {}; }

export async function schedulerHealth() {
  const [row] = await query<{ status: string; lastStartedAt: string; lastFinishedAt: string | null; lastSuccessAt: string | null; processed: number }>(
    `SELECT status, started_at AS "lastStartedAt", finished_at AS "lastFinishedAt",
     last_success_at AS "lastSuccessAt", processed FROM pms_scheduler_state WHERE job = 'delivery'`);
  return row ?? null;
}

/** Every invocation is awaited inside the HTTP request. Lease duration exceeds
 * the route's 120-second hard execution limit; a crashed run can recover later.
 * Individual outbox claims remain atomic even if a prior worker is interrupted. */
export async function runScheduledDelivery(adapters: Readonly<Record<string, PmsDeliveryAdapter>>) {
  const token = randomUUID();
  const [lease] = await query(`INSERT INTO pms_scheduler_state (job, lease_token, lease_until, started_at, status)
    VALUES ('delivery', $1, now() + interval '3 minutes', now(), 'running')
    ON CONFLICT (job) DO UPDATE SET lease_token = $1, lease_until = now() + interval '3 minutes',
      started_at = now(), finished_at = NULL, status = 'running', processed = 0
    WHERE pms_scheduler_state.lease_until <= now() RETURNING job`, [token]);
  if (!lease) return { status: "busy", processed: 0 };
  let status = "failed";
  let processed = 0;
  try {
    if (process.env.STAYGUIDE_PMS_DELIVERY_ENABLED !== "true") status = "disabled";
    else if (!Object.keys(adapters).length) status = "provider_not_connected";
    else {
      const result = await deliverPmsBatch(adapters, 3);
      processed = result.processed;
      status = result.enabled ? "ok" : "disabled";
    }
    return { status, processed };
  } finally {
    await query(`UPDATE pms_scheduler_state SET status = $2, processed = $3, finished_at = now(),
      last_success_at = CASE WHEN $2 = 'ok' THEN now() ELSE last_success_at END,
      lease_until = now() WHERE job = 'delivery' AND lease_token = $1`, [token, status, processed]);
  }
}
