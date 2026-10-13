import { afterEach, describe, expect, it, vi } from "vitest";
import { serviceStatus } from "./status";

vi.mock("@/auth", () => ({ appleConfigured: () => false, authConfigured: () => true, googleConfigured: () => true }));
vi.mock("./password-login", () => ({ passwordLoginConfigured: () => true }));
vi.mock("@/lib/ai", () => ({ aiConfigured: () => true }));
vi.mock("@/lib/db", () => ({ dbConfigured: () => true, query: vi.fn().mockResolvedValue([]) }));

afterEach(() => vi.unstubAllEnvs());

describe("account email health", () => {
  it("reports missing email setup even when accounts are available", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("RESEND_FROM", "");
    const services = await serviceStatus();
    expect(services.find((service) => service.key === "accounts")?.ok).toBe(true);
    expect(services.find((service) => service.key === "email")?.ok).toBe(false);
  });

  it("requires a sender and never exposes credentials", async () => {
    vi.stubEnv("RESEND_API_KEY", "private-test-key");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("RESEND_FROM", "");
    expect((await serviceStatus()).find((service) => service.key === "email")?.ok).toBe(false);
    vi.stubEnv("RESEND_FROM", "StayGuide <hello@example.com>");
    const services = await serviceStatus();
    expect(services.find((service) => service.key === "email")?.ok).toBe(true);
    expect(JSON.stringify(services)).not.toContain("private-test-key");
  });
});
