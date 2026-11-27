import { afterEach, expect, it, vi } from "vitest";
import { assertStripeAccountIdentity, StripeAccountIdentityError } from "./stripe";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("accepts only the configured Stripe account in test mode", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_placeholder");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");
  const fetchMock = vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ id: "acct_expected_qa" }),
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

it("classifies missing and malformed credentials without including credential values", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({ code: "missing_secret_key" });

  vi.stubEnv("STRIPE_SECRET_KEY", "not-a-key");
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({ code: "invalid_secret_key_format" });
});

it.each([
  [401, "stripe_authentication_failed"],
  [403, "stripe_permission_denied"],
  [429, "stripe_rate_limited"],
  [500, "stripe_api_error"],
])("classifies Stripe HTTP %s without logging its response body", async (status, code) => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_placeholder");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive response details", { status })));
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({
    code,
    stripeStatus: status,
  });
});

it("distinguishes account mismatch and mode mismatch", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_placeholder");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ id: "acct_other" }), { status: 200 },
  )));
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({ code: "stripe_account_mismatch" });

  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_qa_placeholder");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ id: "acct_expected_qa" }), { status: 200 },
  )));
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({ code: "stripe_mode_mismatch" });
});


it("distinguishes invalid JSON from a JSON response missing account identity fields", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_placeholder");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>not stripe</html>", {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })));
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({
    code: "stripe_response_invalid_json",
    stripeStatus: 200,
    responseContentType: "text/html",
  });

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ object: "account" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })));
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({
    code: "stripe_response_missing_identity_fields",
    stripeStatus: 200,
    responseHasId: false,
  });
});

it("classifies network failures without exposing the fetch error", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_placeholder");
  vi.stubEnv("STRIPE_EXPECTED_ACCOUNT_ID", "acct_expected_qa");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Bearer sk_test_secret leaked")));
  await expect(assertStripeAccountIdentity()).rejects.toMatchObject({ code: "stripe_network_error" });
  await expect(assertStripeAccountIdentity()).rejects.not.toThrow("sk_test_secret");
});
