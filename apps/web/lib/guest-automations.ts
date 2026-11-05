import { createHash } from "node:crypto";

/**
 * Reservation-driven drafts for StayGuide Manager.
 *
 * This module never contacts a PMS and never sends messages. An authenticated
 * connector must verify ownership and read the reservation from its provider
 * before persisting or approving a draft. Delivery is deliberately a separate,
 * audited integration with an explicit operator-controlled enablement gate.
 */
export type PmsProvider = "guesty" | "hospitable";
export type GuestMessageKind = "pre_arrival" | "check_in" | "check_out" | "upsell";

export type VerifiedReservation = {
  ownerId: string;
  propertyId: string;
  provider: PmsProvider;
  externalReservationId: string;
  status: "confirmed" | "cancelled" | "pending";
  checkInAt: string;
  checkOutAt: string;
  propertyTimeZone: string;
};

export type MessageRule = {
  id: string;
  kind: GuestMessageKind;
  enabled: boolean;
  operatorApproved: boolean;
  hoursBefore: number;
  /** The text is stored as a draft; any placeholders must be resolved only
   * after the linked reservation and the recipient have been reverified. */
  template: string;
};

export type PlannedMessageDraft = {
  idempotencyKey: string;
  ownerId: string;
  propertyId: string;
  provider: PmsProvider;
  externalReservationId: string;
  kind: GuestMessageKind;
  scheduledAt: string;
  body: string;
  status: "awaiting_approval";
  recipientVerified: false;
  deliveryEnabled: false;
};

const HOUR = 3_600_000;
const MAX_LOOKAHEAD = 90 * 24 * HOUR;

/** Reject ambiguous local dates: PMS times must include a UTC offset. */
function parsedTime(value: string): number | null {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function hourInZone(atMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", hourCycle: "h23", timeZone,
  });
  const hour = formatter.formatToParts(new Date(atMs)).find((p) => p.type === "hour")?.value;
  if (hour === undefined) throw new Error("Unsupported property time zone");
  return Number(hour);
}

/**
 * Never schedule a draft between 22:00 and 08:00 local property time. Move
 * forward in 15-minute increments to account for DST transitions; sending
 * remains disabled and must re-check quiet hours at actual delivery time.
 */
export function nextAllowedLocalTime(atMs: number, timeZone: string): number {
  const started = atMs;
  for (let n = 0; n <= 48; n++) {
    const hour = hourInZone(atMs, timeZone);
    if (hour >= 8 && hour < 22) return atMs;
    atMs += 15 * 60_000;
  }
  throw new Error(`Unable to resolve local quiet hours for ${timeZone} after ${atMs - started} ms`);
}

function messageKey(res: VerifiedReservation, ruleId: string): string {
  const value = [res.ownerId, res.propertyId, res.provider, res.externalReservationId, ruleId].join("\u001f");
  return "stayguide-draft-" + createHash("sha256").update(value).digest("hex");
}

/**
 * Produce idempotent human-review drafts for a confirmed booking.
 * No Guesty/Hospitable event is trusted until an authorised adapter has
 * verified that the property and reservation belong to this tenant.
 */
export function planGuestMessageDrafts(
  reservation: VerifiedReservation,
  rules: readonly MessageRule[],
  nowMs = Date.now(),
): PlannedMessageDraft[] {
  if (reservation.status !== "confirmed") return [];
  if (!reservation.ownerId || !reservation.propertyId || !reservation.externalReservationId) return [];
  if (!["guesty", "hospitable"].includes(reservation.provider)) return [];
  const checkIn = parsedTime(reservation.checkInAt);
  const checkOut = parsedTime(reservation.checkOutAt);
  if (checkIn === null || checkOut === null || checkIn >= checkOut) return [];
  if (!Number.isFinite(nowMs)) return [];
  // Validate IANA zone even if no rule is currently due.
  try { hourInZone(nowMs, reservation.propertyTimeZone); }
  catch { return []; }

  const result: PlannedMessageDraft[] = [];
  const seenRuleIds = new Set<string>();
  for (const rule of rules) {
    if (!rule.enabled || !rule.operatorApproved || !rule.id || seenRuleIds.has(rule.id)) continue;
    seenRuleIds.add(rule.id);
    if (!Number.isInteger(rule.hoursBefore) || rule.hoursBefore < 0 || rule.hoursBefore > 720) continue;
    if (!rule.template.trim() || rule.template.length > 2000) continue;
    if (!["pre_arrival", "check_in", "check_out", "upsell"].includes(rule.kind)) continue;
    const anchor = rule.kind === "check_out" ? checkOut : checkIn;
    const scheduled = nextAllowedLocalTime(anchor - rule.hoursBefore * HOUR, reservation.propertyTimeZone);
    if (scheduled <= nowMs || scheduled > nowMs + MAX_LOOKAHEAD) continue;
    result.push({
      idempotencyKey: messageKey(reservation, rule.id),
      ownerId: reservation.ownerId,
      propertyId: reservation.propertyId,
      provider: reservation.provider,
      externalReservationId: reservation.externalReservationId,
      kind: rule.kind,
      scheduledAt: new Date(scheduled).toISOString(),
      body: rule.template,
      status: "awaiting_approval",
      recipientVerified: false,
      deliveryEnabled: false,
    });
  }
  return result.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}
