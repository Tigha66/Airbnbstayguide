import { afterEach, describe, expect, it, vi } from "vitest";
import { stripeCheckoutAllowed } from "./stripe";
afterEach(() => vi.unstubAllEnvs());

describe("no accidental real payments on Vercel previews", () => {
  it("allows Stripe live checkout on Production after other billing checks", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_qa_fixture");
    expect(stripeCheckoutAllowed()).toBe(true);
  });
  it("blocks Stripe live keys on a Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_qa_fixture");
    expect(stripeCheckoutAllowed()).toBe(false);
  });
  it("still allows isolated test-mode payments on a Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_qa_fixture");
    expect(stripeCheckoutAllowed()).toBe(true);
  });
  it("rejects absent or unrecognized Stripe credentials", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(stripeCheckoutAllowed()).toBe(false);
  });
});
