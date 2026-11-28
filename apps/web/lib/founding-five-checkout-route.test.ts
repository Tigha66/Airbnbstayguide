import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  reserve: vi.fn(),
  identity: vi.fn(),
  liveMode: vi.fn(() => false),
}));
vi.mock("@/lib/db", () => ({ query: mocks.query, transaction: vi.fn() }));
vi.mock("@/lib/founding-five-reservations", () => ({ reserveFoundingFiveCustomer: mocks.reserve }));
vi.mock("@/lib/session", () => ({
  requireHost: async () => ({ user: { id: "owner-qa", email: "owner@example.test", emailVerified: true } }),
}));
vi.mock("@/lib/api", () => ({
  safeOrigin: () => true,
  parseJson: (raw: string) => JSON.parse(raw),
}));
vi.mock("@/lib/stripe", () => ({
  appUrl: () => "https://qa.example.test",
  assertStripeAccountIdentity: mocks.identity,
  checkoutIdentity: vi.fn(),
  stripeConfigured: () => true,
  stripeLiveMode: mocks.liveMode,
  stripeClient: () => ({
    prices: { retrieve: async () => ({ id: "price_qa", active: true, currency: "usd", unit_amount: 4900, recurring: null, product: "prod_qa", metadata: { qa_only: "true" } }) },
    products: { retrieve: async () => ({ metadata: { qa_only: "true", environment: "test_mode_only" } }) },
    checkout: { sessions: { retrieve: mocks.retrieve, create: mocks.create } },
  }),
}));

import { POST } from "@/app/api/founding-five/checkout/route";

function request() {
  return new Request("https://qa.example.test/api/founding-five/checkout", {
    method: "POST",
    body: JSON.stringify({ propertyId: "property-qa", qaAgreementAccepted: true }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("FOUNDING_FIVE_QA_ENABLED", "true");
  vi.stubEnv("STRIPE_FOUNDING_FIVE_QA_PRICE_ID", "price_qa");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_qa");
  mocks.liveMode.mockReturnValue(false);
  mocks.query.mockReset();
  mocks.retrieve.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

it("does not record a paid order or create another checkout before the signed webhook arrives", async () => {
  mocks.query.mockResolvedValueOnce([{ id: "property-qa" }])
    .mockResolvedValueOnce([{ id: 1 }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "order-qa", checkout_session_id: "cs_test_existing", status: "pending" }]);
  mocks.retrieve.mockResolvedValue({ status: "complete", payment_status: "paid", payment_intent: "pi_test_existing" });
  const response = await POST(request());
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: expect.stringContaining("signed webhook") });
  expect(mocks.query).toHaveBeenCalledTimes(4);
  expect(mocks.query.mock.calls.every(([sql]) => /^SELECT /.test(sql))).toBe(true);
  expect(mocks.reserve).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

it("blocks production even when the QA enable flag is true", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await POST(request())).status).toBe(503);
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.identity).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

it("rejects live-mode credentials in Preview", async () => {
  mocks.liveMode.mockReturnValue(true);
  expect((await POST(request())).status).toBe(503);
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.identity).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

it("does not access Stripe when the selected property is not owned by the caller", async () => {
  mocks.query.mockResolvedValueOnce([]);
  expect((await POST(request())).status).toBe(404);
  expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("owner_id=$2"), ["property-qa", "owner-qa"]);
  expect(mocks.identity).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
