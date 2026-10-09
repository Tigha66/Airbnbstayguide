import { beforeEach, describe, expect, it, vi } from "vitest";

const cancel = vi.fn();
const retrieve = vi.fn();
const update = vi.fn();
const billing = vi.fn();

vi.mock("./stripe", () => ({
  stripeConfigured: () => true,
  stripeClient: () => ({ subscriptions: { cancel, retrieve, update } }),
  billableQuantity: (n: number) => Math.min(Math.max(n, 1), 100),
  isMissing: (e: unknown) => (e as { code?: string })?.code === "resource_missing",
}));
vi.mock("./repo", () => ({ getBilling: (id: string) => billing(id) }));

const { cancelSubscriptionForDeletion, syncSubscriptionQuantity } = await import("./billing");

beforeEach(() => vi.clearAllMocks());

describe("deleting an account stops billing", () => {
  it("cancels an active subscription before deletion", async () => {
    billing.mockResolvedValue({ stripeSubscriptionId: "sub_1", subscriptionStatus: "active" });
    await cancelSubscriptionForDeletion("u1");
    expect(cancel).toHaveBeenCalledWith("sub_1");
  });
  it("does nothing when there is no live subscription", async () => {
    billing.mockResolvedValue({ stripeSubscriptionId: "sub_1", subscriptionStatus: "canceled" });
    await cancelSubscriptionForDeletion("u1");
    billing.mockResolvedValue({ stripeSubscriptionId: null, subscriptionStatus: null });
    await cancelSubscriptionForDeletion("u1");
    expect(cancel).not.toHaveBeenCalled();
  });
  it("treats a subscription Stripe no longer has as already cancelled", async () => {
    billing.mockResolvedValue({ stripeSubscriptionId: "sub_gone", subscriptionStatus: "active" });
    cancel.mockRejectedValueOnce({ code: "resource_missing" });
    await expect(cancelSubscriptionForDeletion("u1")).resolves.toBeUndefined();
  });
  it("refuses (throws) when Stripe can't confirm the cancellation, so the account is kept", async () => {
    billing.mockResolvedValue({ stripeSubscriptionId: "sub_1", subscriptionStatus: "active" });
    cancel.mockRejectedValueOnce(new Error("Stripe unavailable"));
    await expect(cancelSubscriptionForDeletion("u1")).rejects.toThrow("Stripe unavailable");
  });
});

describe("property count stays in sync with billing", () => {
  it("retries once when Stripe fails the first time", async () => {
    billing.mockResolvedValue({ stripeSubscriptionId: "sub_1", propertyCount: 4 });
    retrieve
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ id: "sub_1", status: "active", items: { data: [{ id: "si_1", quantity: 3 }] } });
    vi.useFakeTimers();
    const done = syncSubscriptionQuantity("u1");
    await vi.runAllTimersAsync();
    await done;
    vi.useRealTimers();
    expect(update).toHaveBeenCalledWith("sub_1", expect.objectContaining({ items: [{ id: "si_1", quantity: 4 }] }));
  });
});
