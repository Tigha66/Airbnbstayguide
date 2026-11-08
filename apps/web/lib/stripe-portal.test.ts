import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portalConfigurationId } from "./stripe";

const mock = vi.hoisted(() => ({ retrieve: vi.fn(), list: vi.fn() }));
vi.mock("stripe", () => ({
  default: class FakeStripe {
    billingPortal = { configurations: { retrieve: mock.retrieve, list: mock.list } };
  },
}));
const portal = {
  id: "bpc_stayguide_qa",
  active: true,
  metadata: { app: "stayguide" },
  features: {
    subscription_cancel: { enabled: true },
    payment_method_update: { enabled: true },
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_portal_fixture");
  vi.stubEnv("STRIPE_PORTAL_CONFIGURATION_ID", "");
  mock.retrieve.mockResolvedValue(portal);
  mock.list.mockResolvedValue({ data: [portal] });
});
afterEach(() => vi.unstubAllEnvs());

describe("billing portal required before a paid subscription", () => {
  it("accepts an active tagged self-service portal with cancellation and payment-method updates", async () => {
    expect(await portalConfigurationId()).toBe(portal.id);
    expect(mock.list).toHaveBeenCalledWith({ active: true, limit: 100 });
  });
  it("validates a configured portal ID instead of blindly trusting an old Vercel value", async () => {
    vi.stubEnv("STRIPE_PORTAL_CONFIGURATION_ID", "bpc_specified");
    expect(await portalConfigurationId()).toBe(portal.id);
    expect(mock.retrieve).toHaveBeenCalledWith("bpc_specified");
    expect(mock.list).not.toHaveBeenCalled();
  });
  it("refuses portal configurations that disable cancellation", async () => {
    mock.list.mockResolvedValueOnce({ data: [
      { ...portal, features: { ...portal.features, subscription_cancel: { enabled: false } } },
    ] });
    await expect(portalConfigurationId()).rejects.toThrow("must allow");
  });
  it("refuses portal configurations that disable card updates", async () => {
    mock.retrieve.mockResolvedValueOnce({ ...portal, features: { ...portal.features, payment_method_update: { enabled: false } } });
    vi.stubEnv("STRIPE_PORTAL_CONFIGURATION_ID", "bpc_bad");
    await expect(portalConfigurationId()).rejects.toThrow("must allow");
  });
  it("rejects a missing or inactive portal even when the ID is in Vercel", async () => {
    mock.retrieve.mockResolvedValueOnce({ ...portal, active: false });
    vi.stubEnv("STRIPE_PORTAL_CONFIGURATION_ID", "bpc_old");
    await expect(portalConfigurationId()).rejects.toThrow("must allow");
  });
  it("refuses a tagged account with no safe portal configuration", async () => {
    mock.list.mockResolvedValueOnce({ data: [{ ...portal, metadata: { app: "another-product" } }] });
    await expect(portalConfigurationId()).rejects.toThrow("must allow");
  });
});
