import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createPortal: vi.fn(), updatePortal: vi.fn(), createWebhook: vi.fn(), updateWebhook: vi.fn(), wrongAmount: false }));
vi.mock("stripe", () => ({ default: class Stripe {
  accounts = { retrieve: async () => ({ id: "acct_fixture" }) };
  products = { search: async ({ query }: { query: string }) => ({ data: [{ id: `prod_${query.match(/plan'\]:'([^']+)'/)![1]}` }] }) };
  prices = { list: async ({ lookup_keys }: { lookup_keys: string[] }) => {
    const [,plan,interval] = lookup_keys[0].split("_");
    return { data: [{ id: `price_${plan}_${interval}`, product: `prod_${plan}`, currency: "usd", unit_amount: mocks.wrongAmount ? 1 : ({ starter: 900, pro: 1900, manager: 19900 }[plan]! * (interval === "yearly" ? 10 : 1)), recurring: { interval: interval === "yearly" ? "year" : "month", interval_count: 1 } }] };
  } };
  billingPortal = { configurations: { list: async () => ({ data: [] }), create: mocks.createPortal, update: mocks.updatePortal } };
  webhookEndpoints = { list: async () => ({ data: [{ id: "we_fixture", url: "https://qa.example.test/api/stripe/webhook", metadata: { app: "stayguide" } }] }), update: mocks.updateWebhook, create: mocks.createWebhook };
} }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mocks.wrongAmount = false;
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_fixture");
  vi.stubEnv("APP_URL", "https://qa.example.test"); vi.stubEnv("ROTATE_WEBHOOK", "");
  mocks.createPortal.mockResolvedValue({ id: "bpc_fixture" });
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("operator billing setup", () => {
  it("creates a cancellation portal without an alternate path to Manager access", async () => {
    await import("../scripts/stripe-setup.mjs");
    expect(mocks.createPortal).toHaveBeenCalledWith(expect.objectContaining({ features: expect.objectContaining({ subscription_update: { enabled: false }, subscription_cancel: { enabled: true, mode: "at_period_end" } }) }));
    expect(mocks.updatePortal).not.toHaveBeenCalled();
    expect(mocks.createWebhook).not.toHaveBeenCalled();
    expect(mocks.updateWebhook).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("STRIPE_PRICE_MANAGER_MONTH=price_manager_monthly");
    expect(console.log).toHaveBeenCalledWith("STRIPE_PRICE_MANAGER_YEAR=price_manager_yearly");
  });
  it("stops before mutation when the configured account differs", async () => {
    vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_other");
    await expect(import("../scripts/stripe-setup.mjs")).rejects.toThrow("reviewed account");
    expect(mocks.createPortal).not.toHaveBeenCalled(); expect(mocks.updateWebhook).not.toHaveBeenCalled();
  });
  it("refuses an existing price with the wrong amount", async () => {
    mocks.wrongAmount = true;
    await expect(import("../scripts/stripe-setup.mjs")).rejects.toThrow("does not match the reviewed catalogue");
    expect(mocks.createPortal).not.toHaveBeenCalled();
  });
});
