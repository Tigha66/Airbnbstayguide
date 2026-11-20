import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyGuestyWebhook } from "@/lib/pms-webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (value: unknown, status: number) => NextResponse.json(value, {
  status,
  headers: { "Cache-Control": "no-store" },
});

/**
 * Receive and stage signed Guesty communication events only.
 *
 * Important: A verified signature establishes source integrity, NOT which
 * StayGuide tenant owns the reservation. Never forward these events directly
 * into a host's inbox or send an automated message from here. The eventual
 * reconciliation worker must fetch current reservation + conversation data
 * using a tenant-authorised Guesty connection and verify property ownership.
 */
export async function POST(request: Request) {
  const secret = process.env.GUESTY_WEBHOOK_SECRET;
  if (!secret) return reply({ error: "Guesty integration not configured" }, 503);
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > 128 * 1024) return reply({ error: "Webhook too large" }, 413);
  let body: string;
  try { body = await request.text(); }
  catch { return reply({ error: "Cannot read webhook" }, 400); }

  let event;
  try { event = verifyGuestyWebhook(body, request.headers, secret); }
  catch { return reply({ error: "Webhook authentication failed" }, 401); }
  if (!event) return reply({ ignored: true }, 200);

  try {
    const rows = await query<{ event_id: string }>(
      `INSERT INTO pms_webhook_events
       (event_id, provider, event_type, external_reservation_id, payload_sha256)
       VALUES ($1, 'guesty', $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.id, event.eventType, event.reservationId, event.payloadDigest],
    );
    return reply({ queued: rows.length > 0, duplicate: rows.length === 0 }, 202);
  } catch {
    // Retry rather than acknowledging receipt without durable persistence.
    return reply({ error: "Event staging unavailable" }, 503);
  }
}
