import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/v1/billing/route";

const mocks = vi.hoisted(() => ({
  host: vi.fn(),
  getBilling: vi.fn(),
  refreshPayouts: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/repo", () => ({ getBilling: mocks.getBilling }));
vi.mock("@/lib/billing", () => ({ refreshPayoutStatus: mocks.refreshPayouts }));
vi.mock("@/lib/stripe", () => ({
  stripeConfigured: () => true,
  subscriptionQuantity: () => 1,
}));
const billing = {
  stripeSubscriptionId: "sub_fixture",
  stripeCustomerId: "cus_fixture",
  stripeAccountId: null,
  payoutsReady: false,
  plan: "free",
  propertyCount: 0,
  subscriptionStatus: "incomplete_expired",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.host.mockResolvedValue({ user: { id: "host-fixture" } });
  mocks.getBilling.mockResolvedValue(billing);
});

describe("payment recovery billing state", () => {
  it("permits another checkout after an incomplete subscription expires", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "incomplete_expired", subscribed: false, stripe: true,
    });
  });
  it.each(["active", "trialing", "past_due", "unpaid", "incomplete"])(
    "retains billing management for an existing %s subscription",
    async (status) => {
      mocks.getBilling.mockResolvedValueOnce({ ...billing, subscriptionStatus: status });
      expect((await (await GET()).json()).subscribed).toBe(true);
    },
  );
  it.each(["canceled", "incomplete_expired"])(
    "does not trap a host with a terminal %s subscription",
    async (status) => {
      mocks.getBilling.mockResolvedValueOnce({ ...billing, subscriptionStatus: status });
      expect((await (await GET()).json()).subscribed).toBe(false);
    },
  );
  it("does not expose billing data without authentication", async () => {
    const { NextResponse } = await import("next/server");
    mocks.host.mockResolvedValueOnce({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.getBilling).not.toHaveBeenCalled();
  });
});
