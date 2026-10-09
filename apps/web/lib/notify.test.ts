import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = {
  consumeRateLimit: vi.fn(async () => true),
  hostContact: vi.fn(async () => ({ email: "host@example.com", name: "Ana", notifyEmail: true })),
  extraRequestDetails: vi.fn(async () => ({ guestName: "Sam", guestContact: "sam@example.com", extraName: "Late checkout", propertyName: "Casa", slug: "casa" })),
};
const send = vi.fn(async () => true);
let configured = true;
vi.mock("./repo", () => repo);
vi.mock("./email", async (orig) => ({ ...(await orig<typeof import("./email")>()), emailConfigured: () => configured, sendEmail: send }));
vi.mock("next/server", () => ({ after: () => { throw new Error("outside a request"); } }));

const { notifyEscalation, notifyExtraDecision, notifyExtraRequest } = await import("./notify");
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  configured = true;
});

describe("host notifications", () => {
  const escalation = { ownerId: "o1", threadId: "t1", propertyName: "Casa", question: "Dogs?", language: "en" };
  it("emails the host about an escalated question, throttled per conversation", async () => {
    expect(await notifyEscalation(escalation)).toBe(true);
    await flush();
    expect(repo.consumeRateLimit).toHaveBeenCalledWith("notify-escalation:t1", 1, 600);
    expect(send).toHaveBeenCalledTimes(1);
    repo.consumeRateLimit.mockResolvedValueOnce(false); // second question within 10 minutes
    expect(await notifyEscalation(escalation)).toBe(true);
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("doesn't email (and says so) when the host turned notifications off or email isn't set up", async () => {
    repo.hostContact.mockResolvedValueOnce({ email: "host@example.com", name: "Ana", notifyEmail: false });
    expect(await notifyEscalation(escalation)).toBe(false);
    configured = false;
    expect(await notifyEscalation(escalation)).toBe(false);
    expect(await notifyExtraRequest({ ownerId: "o1", propertyName: "Casa", extraName: "X", guestName: "Sam", guestContact: "s@x.com", note: "", paidOnline: false })).toBe(false);
    await flush();
    expect(send).not.toHaveBeenCalled();
  });
  it("emails the guest about a decision only if they left an email address", async () => {
    expect(await notifyExtraDecision("o1", "r1", true)).toBe(true);
    repo.extraRequestDetails.mockResolvedValueOnce({ guestName: "Sam", guestContact: "+44 7700 900123", extraName: "X", propertyName: "Casa", slug: "casa" });
    expect(await notifyExtraDecision("o1", "r1", true)).toBe(false);
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("billing emails", () => {
  it("emails the host about a failed payment even with notifications off", async () => {
    const { notifyPaymentFailed } = await import("./notify");
    repo.hostContact.mockResolvedValueOnce({ email: "host@example.com", name: "Ana", notifyEmail: false });
    expect(await notifyPaymentFailed("o1")).toBe(true);
    await flush();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "host@example.com", subject: expect.stringContaining("payment") }));
  });
});
