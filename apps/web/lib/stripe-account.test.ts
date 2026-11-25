import { afterEach, expect, it, vi } from "vitest";
import { assertStripeAccountIdentity } from "./stripe";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("accepts only the configured Stripe account in test mode", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_placeholder");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");
  const fetchMock = vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ id: "acct_expected_qa", livemode: false }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  ));
  vi.stubGlobal("fetch", fetchMock);

  await expect(assertStripeAccountIdentity()).resolves.toEqual({
    id: "acct_expected_qa", livemode: false,
  });
  expect(fetchMock).toHaveBeenCalledWith("https://api.stripe.com/v1/account", expect.objectContaining({
    method: "GET",
    headers: { Authorization: "Bearer sk_test_qa_placeholder" },
    cache: "no-store",
  }));
});

it("fails closed when the API key resolves to a different account or mode", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_placeholder");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ id: "acct_other", livemode: false }),
    { status: 200 },
  )));
  await expect(assertStripeAccountIdentity()).rejects.toThrow("Stripe account identity or mode");

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ id: "acct_expected_qa", livemode: true }),
    { status: 200 },
  )));
  await expect(assertStripeAccountIdentity()).rejects.toThrow("Stripe account identity or mode");
});
