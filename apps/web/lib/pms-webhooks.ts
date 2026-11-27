import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Authenticates only the transport. All PMS data still needs a provider API
 * reconciliation and a tenant-owned property link before it reaches any inbox. */
export type VerifiedGuestyEvent = {
  id: string;
  eventType: "reservation.messageReceived" | "reservation.messageSent";
  reservationId: string;
  payloadDigest: string;
};

const supported = new Set(["reservation.messageReceived", "reservation.messageSent"]);
const signatureTimeToleranceMs = 5 * 60 * 1000;
const maxPayloadBytes = 128 * 1024;

/** Guesty uses Svix-compatible signatures (v1 HMAC over id.timestamp.raw_body).
 * See https://open-api-docs.guesty.com/docs/webhooks and
 * https://docs.svix.com/receiving/verifying-payloads/how */
export function verifyGuestyWebhook(
  rawBody: string,
  headers: Headers,
  signingSecret: string,
  nowMs = Date.now(),
): VerifiedGuestyEvent | null {
  if (Buffer.byteLength(rawBody, "utf8") > maxPayloadBytes) throw new Error("Webhook too large");
  if (!signingSecret.startsWith("whsec_") || signingSecret.length < 15) throw new Error("Webhook signing secret is not configured");
  const id = headers.get("svix-id") ?? headers.get("webhook-id") ?? "";
  const timestamp = headers.get("svix-timestamp") ?? headers.get("webhook-timestamp") ?? "";
  const signatures = headers.get("svix-signature") ?? headers.get("webhook-signature") ?? "";
  if (!/^[\w-]{1,150}$/.test(id) || !/^\d{10,13}$/.test(timestamp)) throw new Error("Invalid webhook headers");
  const sentAt = Number(timestamp) * 1000;
  if (!Number.isFinite(sentAt) || Math.abs(nowMs - sentAt) > signatureTimeToleranceMs) throw new Error("Stale webhook");
  const secretBytes = Buffer.from(signingSecret.slice(6), "base64");
  if (secretBytes.length < 16) throw new Error("Invalid webhook signing secret");
  const content = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(content).digest();
  const valid = signatures.split(/\s+/).some((sig) => {
    if (!sig.startsWith("v1,")) return false;
    const encoded = sig.slice(3);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
    const supplied = Buffer.from(encoded, "base64");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
  if (!valid) throw new Error("Webhook signature verification failed");

  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); }
  catch { throw new Error("Invalid webhook JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid webhook payload");
  const body = parsed as Record<string, unknown>;
  const eventType = body.event;
  if (typeof eventType !== "string" || !supported.has(eventType)) return null;
  const reservationId = body.reservationId;
  if (typeof reservationId !== "string" || !/^[\w-]{1,150}$/.test(reservationId)) return null;
  // Ignore message bodies, guests and contact fields, and unverified owner IDs.
  return {
    id,
    eventType: eventType as VerifiedGuestyEvent["eventType"],
    reservationId,
    payloadDigest: createHash("sha256").update(rawBody).digest("hex"),
  };
}
