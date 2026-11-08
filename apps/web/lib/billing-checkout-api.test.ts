import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/billing/checkout/route";

const mocks = vi.hoisted(() => ({
  host: vi.fn(),
  billing: vi.fn(),
  customer: vi.fn(),
  portal: vi.fn(),
  price: vi.fn(),
  subscriptions: vi.fn(),
  open: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/repo", () => ({ getBilling: mocks.billing }));
vi.mock("@/lib/billing", () => ({ ensureCustomer: mocks.customer }));
vi.mock("@/lib/stripe", () => ({
  stripeConfigured: () => true,
  stripeCheckoutAllowed: () => true,
  appUrl: () => "https://www.getstayguide.com",
  subscriptionQuantity: () => 1,
  checkoutIdentity: () => ({ idempotencyKey: "fixture:checkout", integrationIdentifier: "fixture_integration" }),
  priceId: mocks.price,
  portalConfigurationId: mocks.portal,
  stripeClient: () => ({
    subscriptions: { list: mocks.subscriptions },
    checkout: { sessions: { list: mocks.open, create: mocks.create } },
  }),
}));
const request = (payload: unknown) => new Request("https://www.getstayguide.com/api/v1/billing/checkout", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture_secret");
  mocks.host.mockResolvedValue({ user: { id: "fixture-user", name: "Fixture host", email: "fixture@example.test", emailVerified: true } });
  mocks.billing.mockResolvedValue({ propertyCount: 1, stripeSubscriptionId: null });
  mocks.customer.mockResolvedValue("cus_fixture");
  mocks.portal.mockResolvedValue("bpc_fixture");
  mocks.price.mockResolvedValue("price_fixture");
  mocks.subscriptions.mockResolvedValue({ data: [] });
  mocks.open.mockResolvedValue({ data: [] });
  mocks.create.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_fixture" });
});

describe("paid signup / subscription checkout acceptance", () => {
  it("does not create a Stripe customer or charge if the cancellation portal is not configured", async () => {
    mocks.portal.mockRejectedValueOnce(new Error("No StayGuide portal configuration"));
    const response = await POST(request({ plan: "starter", yearly: false }));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("temporarily unavailable");
    expect(mocks.customer).not.toHaveBeenCalled();
    expect(mocks.subscriptions).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires verified email before any Stripe API call", async () => {
    mocks.host.mockResolvedValueOnce({ user: { id: "fixture-user", emailVerified: false } });
    const response = await POST(request({ plan: "starter" }));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("EMAIL_NOT_VERIFIED");
    expect(mocks.portal).not.toHaveBeenCalled();
    expect(mocks.customer).not.toHaveBeenCalled();
  });
  it("reuses the existing subscription instead of starting duplicate billing", async () => {
    mocks.subscriptions.mockResolvedValueOnce({ data: [{ status: "active" }] });
    const response = await POST(request({ plan: "pro", yearly: false }));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("ALREADY_SUBSCRIBED");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("opens checkout only after portal, email and subscription checks pass", async () => {
    const response = await POST(request({ plan: "starter", yearly: false }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_fixture" });
    expect(mocks.portal).toHaveBeenCalledOnce();
    expect(mocks.price).toHaveBeenCalledWith("starter", false);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: "cus_fixture", mode: "subscription",
      subscription_data: { metadata: { app: "stayguide", user_id: "fixture-user" } },
    }), { idempotencyKey: "fixture:checkout" });
  });
});
