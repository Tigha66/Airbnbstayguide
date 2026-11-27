import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshPayoutStatus } from "./billing";

const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("./stripe", () => ({
  stripeConfigured: () => true,
  stripeClient: () => ({ accounts: { retrieve: mocks.account } }),
  subscriptionQuantity: vi.fn(),
  planFromSubscription: vi.fn(),
  isMissing: (error: unknown) => (error as { code?: string })?.code === "resource_missing",
}));
vi.mock("./repo", () => ({
  clearStripeAccount: mocks.clear,
  setStripeAccount: mocks.save,
  clearStripeCustomer: vi.fn(),
  getBilling: vi.fn(),
  setStripeCustomer: vi.fn(),
}));

const account = {
  id: "acct_qa",
  charges_enabled: true,
  payouts_enabled: true,
  details_submitted: true,
  capabilities: { transfers: "active" },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue(account);
});

describe("Stripe Connect payout readiness", () => {
  it("requires active transfers, enabled payouts, charges, and completed details", async () => {
    for (const change of [
      { payouts_enabled: false },
      { charges_enabled: false },
      { details_submitted: false },
      { capabilities: { transfers: "pending" } },
      { capabilities: undefined },
    ]) {
      mocks.account.mockResolvedValueOnce({ ...account, ...change });
      expect(await refreshPayoutStatus("host1", account.id)).toBe(false);
    }
    expect(mocks.save).toHaveBeenCalledTimes(5);
    expect(mocks.save).toHaveBeenCalledWith("host1", account.id, false);
  });

  it("marks the account ready only when Stripe confirms every capability", async () => {
    expect(await refreshPayoutStatus("host1", account.id)).toBe(true);
    expect(mocks.save).toHaveBeenCalledWith("host1", account.id, true);
  });

  it("clears a missing Stripe account and rejects unverified accounts", async () => {
    mocks.account.mockRejectedValueOnce({ code: "resource_missing" });
    expect(await refreshPayoutStatus("host1", account.id)).toBe(false);
    expect(mocks.clear).toHaveBeenCalledWith("host1");
  });

  it("treats a transient provider outage as not payout-ready without deleting mapping", async () => {
    mocks.account.mockRejectedValueOnce(new Error("Stripe temporarily unavailable"));
    expect(await refreshPayoutStatus("host1", account.id)).toBe(false);
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
