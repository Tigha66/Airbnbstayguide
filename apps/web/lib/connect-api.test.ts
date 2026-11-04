import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/v1/connect/route";

const mocks = vi.hoisted(() => ({
  host: vi.fn(),
  origin: vi.fn(),
  getBilling: vi.fn(),
  setStripeAccount: vi.fn(),
  clearStripeAccount: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  accountLink: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("./api")>(),
  safeOrigin: mocks.origin,
}));
vi.mock("@/lib/repo", () => ({
  getBilling: mocks.getBilling,
  setStripeAccount: mocks.setStripeAccount,
  clearStripeAccount: mocks.clearStripeAccount,
}));
vi.mock("@/lib/stripe", () => ({
  appUrl: () => "https://www.getstayguide.com",
  stripeConfigured: () => true,
  isMissing: () => false,
  stripeClient: () => ({
    accounts: { create: mocks.create, retrieve: mocks.retrieve },
    accountLinks: { create: mocks.accountLink },
  }),
}));

const request = (body: string) =>
  new Request("https://www.getstayguide.com/api/v1/connect", { method: "POST", body });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.origin.mockReturnValue(true);
  mocks.host.mockResolvedValue({ user: { id: "host-fixture", email: "host@example.test" } });
  mocks.getBilling.mockResolvedValue(null);
});

describe("Stripe Connect onboarding error safety", () => {
  it("rejects malformed or oversized payloads without calling Stripe", async () => {
    for (const body of ["{", JSON.stringify({ country: "ZZZ" }), JSON.stringify({ payload: "x".repeat(25_000) })]) {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns a safe platform-profile error without private Stripe details", async () => {
    const sensitive = "private_stripe_request_detail_123";
    mocks.create.mockRejectedValueOnce(Object.assign(
      new Error("You must complete your platform profile to create connected accounts: " + sensitive),
      { type: "StripeInvalidRequestError", statusCode: 400 },
    ));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request("{}"));
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.code).toBe("CONNECT_PROFILE_INCOMPLETE");
      expect(JSON.stringify(body)).not.toContain(sensitive);
      expect(JSON.stringify(spy.mock.calls)).not.toContain(sensitive);
    } finally {
      spy.mockRestore();
    }
  });

  it("does not expose unexpected Stripe provider error messages", async () => {
    const sensitive = "private_provider_response_and_headers";
    mocks.create.mockRejectedValueOnce(Object.assign(new Error(sensitive), { type: "StripeAPIError", statusCode: 502 }));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request("{}"));
      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.code).toBe("CONNECT_FAILED");
      expect(JSON.stringify(body)).not.toContain(sensitive);
      expect(JSON.stringify(spy.mock.calls)).not.toContain(sensitive);
    } finally {
      spy.mockRestore();
    }
  });
});
