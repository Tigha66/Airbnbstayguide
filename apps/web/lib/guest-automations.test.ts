import { describe, expect, it } from "vitest";
import {
  nextAllowedLocalTime,
  planGuestMessageDrafts,
  type MessageRule,
  type VerifiedReservation,
} from "./guest-automations";

const reservation: VerifiedReservation = {
  ownerId: "owner-a",
  propertyId: "property-a",
  provider: "guesty",
  externalReservationId: "res-123",
  status: "confirmed",
  checkInAt: "2026-11-01T15:00:00Z",
  checkOutAt: "2026-11-05T11:00:00Z",
  propertyTimeZone: "Europe/London",
};
const now = Date.parse("2026-10-27T10:00:00Z");
const rule: MessageRule = {
  id: "arrival-24h",
  kind: "pre_arrival",
  enabled: true,
  operatorApproved: true,
  hoursBefore: 24,
  template: "Welcome. Here is your guide: {{guide_link}}",
};

describe("provider-independent Manager message draft planning", () => {
  it("prepares a scheduled human-review draft and never sends a message", () => {
    const drafts = planGuestMessageDrafts(reservation, [rule], now);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      kind: "pre_arrival",
      scheduledAt: "2026-10-31T15:00:00.000Z",
      status: "awaiting_approval",
      recipientVerified: false,
      deliveryEnabled: false,
    });
    expect(drafts[0].body).toContain("{{guide_link}}");
  });

  it("keeps the same key for retried events but different keys for each tenant", () => {
    const first = planGuestMessageDrafts(reservation, [rule, rule], now);
    const retried = planGuestMessageDrafts(reservation, [rule], now);
    const other = planGuestMessageDrafts({ ...reservation, ownerId: "owner-b" }, [rule], now);
    expect(first).toHaveLength(1);
    expect(first[0].idempotencyKey).toEqual(retried[0].idempotencyKey);
    expect(other[0].idempotencyKey).not.toEqual(first[0].idempotencyKey);
    expect(first[0].idempotencyKey).not.toContain("res-123");
  });

  it("refuses cancelled, unconfirmed, malformed and ambiguous reservation events", () => {
    expect(planGuestMessageDrafts({ ...reservation, status: "cancelled" }, [rule], now)).toEqual([]);
    expect(planGuestMessageDrafts({ ...reservation, status: "pending" }, [rule], now)).toEqual([]);
    expect(planGuestMessageDrafts({ ...reservation, checkInAt: "2026-11-01 15:00" }, [rule], now)).toEqual([]);
    expect(planGuestMessageDrafts({ ...reservation, checkOutAt: "2026-10-31T11:00:00Z" }, [rule], now)).toEqual([]);
    expect(planGuestMessageDrafts({ ...reservation, propertyTimeZone: "Invalid/TimeZone" }, [rule], now)).toEqual([]);
  });

  it("requires enabled, operator-approved templates; upsells are only drafts", () => {
    expect(planGuestMessageDrafts(reservation, [{ ...rule, enabled: false }], now)).toEqual([]);
    expect(planGuestMessageDrafts(reservation, [{ ...rule, operatorApproved: false }], now)).toEqual([]);
    expect(planGuestMessageDrafts(reservation, [{ ...rule, template: " " }], now)).toEqual([]);
    const [upsell] = planGuestMessageDrafts(
      reservation,
      [{ ...rule, id: "upsell", kind: "upsell", template: "Would you like a later checkout?" }],
      now,
    );
    expect(upsell.kind).toBe("upsell");
    expect(upsell.status).toBe("awaiting_approval");
    expect(upsell.deliveryEnabled).toBe(false);
  });

  it("moves drafts out of local quiet hours and handles London DST changes", () => {
    const first = Date.parse("2026-11-01T23:00:00Z");
    expect(new Date(nextAllowedLocalTime(first, "Europe/London")).toISOString()).toBe("2026-11-02T08:00:00.000Z");
    // 2026-03-29 starts British Summer Time: 07:00 UTC is 08:00 local.
    const spring = Date.parse("2026-03-28T23:00:00Z");
    expect(new Date(nextAllowedLocalTime(spring, "Europe/London")).toISOString()).toBe("2026-03-29T07:00:00.000Z");
  });

  it("drops expired and far-future events and rejects unsafe scheduling settings", () => {
    expect(planGuestMessageDrafts(reservation, [rule], Date.parse("2026-11-10T00:00:00Z"))).toEqual([]);
    expect(planGuestMessageDrafts(reservation, [rule], Date.parse("2026-01-01T00:00:00Z"))).toEqual([]);
    expect(planGuestMessageDrafts(reservation, [{ ...rule, hoursBefore: -1 }], now)).toEqual([]);
    expect(planGuestMessageDrafts(reservation, [{ ...rule, hoursBefore: 900 }], now)).toEqual([]);
  });

  it("supports Hospitable-normalised verified reservations without inventing provider API payloads", () => {
    const [draft] = planGuestMessageDrafts({ ...reservation, provider: "hospitable" }, [rule], now);
    expect(draft.provider).toBe("hospitable");
  });
});
