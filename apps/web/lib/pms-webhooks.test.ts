import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGuestyWebhook } from "./pms-webhooks";

const key = Buffer.from("some-deterministic-32-byte-secret-value", "utf8");
const secret = "whsec_" + key.toString("base64");
const timestamp = 1800000000;
const now = timestamp * 1000;
const payload = JSON.stringify({
  event: "reservation.messageReceived",
  reservationId: "reservation_abc",
  owner_id: "a client supplied value that must be ignored",
  conversation: { guestEmail: "guest@example.test" },
});

function signed(payloadText: string, id = "msg_testid", ts = timestamp) {
  const raw = `${id}.${ts}.${payloadText}`;
  const signature = createHmac("sha256", key).update(raw).digest("base64");
  return new Headers({
    "svix-id": id,
    "svix-timestamp": String(ts),
    "svix-signature": "v1," + signature,
  });
}

describe("Guesty webhook trust boundary", () => {
  it("accepts a recent signed message event and stores only minimal metadata", () => {
    const verified = verifyGuestyWebhook(payload, signed(payload), secret, now);
    expect(verified).toEqual({
      id: "msg_testid",
      eventType: "reservation.messageReceived",
      reservationId: "reservation_abc",
      payloadDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(JSON.stringify(verified)).not.toContain("guest@example.test");
  });
  it("accepts signed webhook-* aliases, but never unsigned events", () => {
    const headers = signed(payload);
    const alternate = new Headers({
      "webhook-id": headers.get("svix-id")!,
      "webhook-timestamp": headers.get("svix-timestamp")!,
      "webhook-signature": headers.get("svix-signature")!,
    });
    expect(verifyGuestyWebhook(payload, alternate, secret, now)?.id).toBe("msg_testid");
    expect(() => verifyGuestyWebhook(payload, new Headers(), secret, now)).toThrow();
  });
  it("rejects tampering, stale timestamps and future timestamps", () => {
    expect(() => verifyGuestyWebhook(payload + " ", signed(payload), secret, now)).toThrow();
    expect(() => verifyGuestyWebhook(payload, signed(payload), secret, now + 301_000)).toThrow();
    expect(() => verifyGuestyWebhook(payload, signed(payload), secret, now - 301_000)).toThrow();
  });
  it("supports multiple signatures, but rejects a wrong secret or old signature version", () => {
    const headers = signed(payload);
    headers.set("svix-signature", "v1," + Buffer.alloc(32).toString("base64") + " " + headers.get("svix-signature"));
    expect(verifyGuestyWebhook(payload, headers, secret, now)).not.toBeNull();
    expect(() => verifyGuestyWebhook(payload, headers, "whsec_" + Buffer.alloc(32, 3).toString("base64"), now)).toThrow();
    headers.set("svix-signature", "v2," + Buffer.alloc(32).toString("base64"));
    expect(() => verifyGuestyWebhook(payload, headers, secret, now)).toThrow();
  });
  it("drops unsupported and unlinked message events after signature verification", () => {
    const unknown = JSON.stringify({ event: "reservation.updated.v2", reservationId: "abc" });
    expect(verifyGuestyWebhook(unknown, signed(unknown), secret, now)).toBeNull();
    const noId = JSON.stringify({ event: "reservation.messageReceived" });
    expect(verifyGuestyWebhook(noId, signed(noId), secret, now)).toBeNull();
  });
  it("rejects huge payloads and malformed signed JSON", () => {
    const huge = "x".repeat(128 * 1024 + 1);
    expect(() => verifyGuestyWebhook(huge, signed(huge), secret, now)).toThrow();
    const broken = "{broken}";
    expect(() => verifyGuestyWebhook(broken, signed(broken), secret, now)).toThrow();
  });
});
