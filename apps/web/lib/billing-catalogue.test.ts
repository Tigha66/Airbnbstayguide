import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ price: vi.fn(), prices: vi.fn(), portal: vi.fn(), portals: vi.fn() }));
vi.mock("stripe", () => ({ default: class Stripe { prices = { retrieve: mocks.price, list: mocks.prices }; billingPortal = { configurations: { retrieve: mocks.portal, list: mocks.portals } }; } }));
import { priceId, portalConfigurationId } from "./stripe";
const valid = () => ({ id: "price_manager", active: true, currency: "usd", unit_amount: 19900, lookup_key: "stayguide_manager_monthly_usd", recurring: { interval: "month", interval_count: 1 } });
const portal = () => ({ id: "bpc_stayguide", active: true, metadata: { app: "stayguide" }, features: { subscription_update: { enabled: false }, subscription_cancel: { enabled: true } } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); vi.stubEnv("STRIPE_PRICE_MANAGER_MONTH", "price_manager"); vi.stubEnv("STRIPE_PORTAL_CONFIGURATION_ID", "bpc_stayguide");
  mocks.price.mockResolvedValue(valid()); mocks.portal.mockResolvedValue(portal());
});
afterEach(() => vi.unstubAllEnvs());
describe("reviewed Manager billing catalogue and portal", () => {
  it("accepts verified monthly and yearly catalogue prices", async () => {
    expect(await priceId("manager", false)).toBe("price_manager");
    vi.stubEnv("STRIPE_PRICE_MANAGER_YEAR", "price_manager_year");
    mocks.price.mockResolvedValue({ ...valid(), id: "price_manager_year", unit_amount: 199000, lookup_key: "stayguide_manager_yearly_usd", recurring: { interval: "year", interval_count: 1 } });
    expect(await priceId("manager", true)).toBe("price_manager_year");
  });
  it("rejects wrong amount, cadence, currency, archive state and unrelated catalogue keys", async () => {
    for (const patch of [{ active: false }, { currency: "eur" }, { unit_amount: 1 }, { lookup_key: "unrelated_monthly" }, { recurring: { interval: "month", interval_count: 2 } }]) {
      mocks.price.mockResolvedValue({ ...valid(), ...patch }); await expect(priceId("manager", false)).rejects.toThrow();
    }
  });
  it("accepts the reviewed cancellation portal and rejects settings that bypass rollout gates", async () => {
    expect(await portalConfigurationId()).toBe("bpc_stayguide");
    for (const patch of [{ active: false }, { metadata: { app: "other" } }, { features: { subscription_update: { enabled: true }, subscription_cancel: { enabled: true } } }, { features: { subscription_update: { enabled: false }, subscription_cancel: { enabled: false } } }]) {
      mocks.portal.mockResolvedValue({ ...portal(), ...patch }); await expect(portalConfigurationId()).rejects.toThrow();
    }
  });
});
