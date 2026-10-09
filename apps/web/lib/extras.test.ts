import { describe, expect, it } from "vitest";
import { canChangeManualExtra } from "./extras";
import { GUIDE_JSON_LIMIT, parseJson, parseJsonOrNull, RequestTooLarge } from "./api";

describe("manually paid extras", () => {
  it("allows pending → approved/declined and approved → paid only", () => {
    expect(canChangeManualExtra("pending", "approved")).toBe(true);
    expect(canChangeManualExtra("pending", "declined")).toBe(true);
    expect(canChangeManualExtra("approved", "paid")).toBe(true);
    expect(canChangeManualExtra("declined", "paid")).toBe(false);
    expect(canChangeManualExtra("pending", "paid")).toBe(false);
    expect(canChangeManualExtra("paid", "declined")).toBe(false);
    expect(canChangeManualExtra("unknown", "paid")).toBe(false);
  });
});

describe("JSON bodies", () => {
  it("rejects bodies over the limit and accepts a larger one for whole guides", () => {
    const big = JSON.stringify({ x: "a".repeat(30_000) });
    expect(() => parseJson(big)).toThrow(RequestTooLarge);
    expect(parseJson(big, GUIDE_JSON_LIMIT)).toEqual({ x: "a".repeat(30_000) });
  });
  it("turns malformed or oversized bodies into null (so routes answer 400, not 500)", () => {
    expect(parseJsonOrNull("{not json")).toBeNull();
    expect(parseJsonOrNull(JSON.stringify({ x: "a".repeat(30_000) }))).toBeNull();
    expect(parseJsonOrNull('{"ok":true}')).toEqual({ ok: true });
  });
});
