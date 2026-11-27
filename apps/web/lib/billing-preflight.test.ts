import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { billingPreflight } from "./billing-preflight";
import { GET } from "@/app/api/v1/admin/billing-preflight/route";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  price: vi.fn(),
  portal: vi.fn(),
  endpoints: vi.fn(),
  sender: vi.fn(),
  host: vi.fn(),
}));
vi.mock("./db", () => ({
  dbConfigured: () => true, query: mocks.query,
}));
vi.mock("./mailer", () => ({ mailerConfigured: () => true, senderDomainReadiness: mocks.sender }));
vi.mock("./stripe", () => ({
  stripeConfigured: () => true,
  stripeLiveMode: () => true,
  priceId: mocks.price,
  portalConfigurationId: mocks.portal,
  stripeClient: () => ({ webhookEndpoints: { list: mocks.endpoints } }),
}));
vi.mock("@/lib/session", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/admin", () => ({
  isAdminEmail: (email?: string) => email === "founder@example.test",
}));

const enabledWebhook = {
  url: "https://www.getstayguide.com/api/stripe/webhook",
  status: "enabled",
  enabled_events: [
    "checkout.session.completed", "customer.subscription.updated",
    "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed",
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.getstayguide.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.getstayguide.com");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_qa_fixture");
  vi.stubEnv("VERCEL_ENV", "production");
  mocks.query.mockResolvedValue([]);
  mocks.price.mockResolvedValue("price_qa");
  mocks.portal.mockResolvedValue("bpc_qa");
  mocks.endpoints.mockResolvedValue({ data: [enabledWebhook] });
  mocks.sender.mockResolvedValue({ ok: true, detail: "Resend sender domain verified; delivery not tested." });
  mocks.host.mockResolvedValue({ user: { email: "founder@example.test" } });
});
afterEach(() => vi.unstubAllEnvs());

describe("owner Stripe subscriptions launch preflight", () => {
  it("checks prices, portal and matching webhook without charging or claiming delivery", async () => {
    const report = await billingPreflight();
    expect(report.configurationReady).toBe(true);
    expect(report.stripeMode).toBe("live");
    expect(report.kind).toBe("configuration-only");
    expect(report.livePaymentVerified).toBe(false);
    expect(report.emailDeliveryVerified).toBe(false);
    expect(report.productionRestoreVerified).toBe(false);
    expect(report.checks.find(c => c.key === "stripe_webhook_endpoint")?.ok).toBe(true);
    expect(mocks.price).toHaveBeenCalledTimes(6);
    expect(mocks.endpoints).toHaveBeenCalledWith({ limit: 100 });
    expect(JSON.stringify(report)).not.toContain("whsec_qa_fixture");
    expect(JSON.stringify(report)).not.toContain("price_qa");
  });

  it("reports every failed product price independently", async () => {
    mocks.price.mockImplementation(async (plan: string, yearly: boolean) => {
      if (plan === "manager" && yearly) throw new Error("Incorrect amount");
      return "price_qa";
    });
    const report = await billingPreflight();
    expect(report.configurationReady).toBe(false);
    expect(report.checks.find(c => c.key === "price_manager_year")?.ok).toBe(false);
    expect(report.checks.find(c => c.key === "price_pro_month")?.ok).toBe(true);
  });

  it("reports a missing/unverified Resend sender domain without claiming account delivery", async () => {
    mocks.sender.mockResolvedValueOnce({ ok: false, detail: "Sender domain not verified" });
    const report = await billingPreflight();
    expect(report.configurationReady).toBe(false);
    expect(report.checks.find(c => c.key === "email_sender_domain")?.ok).toBe(false);
    expect(report.emailDeliveryVerified).toBe(false);
  });

  it("fails safely for wrong webhook endpoint or inaccessible billing portal", async () => {
    mocks.endpoints.mockResolvedValueOnce({ data: [{ ...enabledWebhook, url: "https://preview.vercel.app/api/stripe/webhook" }] });
    mocks.portal.mockRejectedValueOnce(new Error("Portal not found"));
    const report = await billingPreflight();
    expect(report.configurationReady).toBe(false);
    expect(report.checks.find(c => c.key === "stripe_webhook_endpoint")?.ok).toBe(false);
    expect(report.checks.find(c => c.key === "billing_portal")?.ok).toBe(false);
  });

  it("does not claim a working database if the billing schema is unavailable", async () => {
    mocks.query.mockRejectedValueOnce(new Error("relation missing"));
    const report = await billingPreflight();
    expect(report.configurationReady).toBe(false);
    expect(report.checks.find(c => c.key === "database_schema")?.ok).toBe(false);
  });

  it("returns 404 before Stripe calls to users who are not the owner", async () => {
    mocks.host.mockResolvedValueOnce({ user: { email: "another@example.test" } });
    let response = await GET();
    expect(response.status).toBe(404);
    expect(mocks.price).not.toHaveBeenCalled();
    mocks.host.mockResolvedValueOnce({ response: { status: 401 } });
    response = await GET();
    expect(response.status).toBe(404);
    expect(mocks.price).not.toHaveBeenCalled();
  });

  it("returns a private, read-only report to the authenticated owner", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).configurationReady).toBe(true);
  });
});
