import { afterEach, describe, expect, it, vi } from "vitest";
import { mailerConfigured, sendEmail } from "./mailer";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Resend environment configuration", () => {
  it("recognises the earlier RESENDAPIKEY alias with an existing sender address", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESENDAPIKEY", "legacy-fixture-key");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "StayGuide <notifications@getstayguide.com>");
    expect(mailerConfigured()).toBe(true);
  });

  it("still requires a sender address when the legacy key exists", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESENDAPIKEY", "legacy-fixture-key");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.stubEnv("RESEND_FROM", "");
    expect(mailerConfigured()).toBe(false);
  });

  it("prefers the canonical RESEND_API_KEY and uses the configured sender", async () => {
    vi.stubEnv("RESEND_API_KEY", "canonical-fixture-key");
    vi.stubEnv("RESENDAPIKEY", "legacy-fixture-key");
    vi.stubEnv("EMAIL_FROM", "StayGuide <notifications@getstayguide.com>");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "mock-resend" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail({ to: "guest@example.test", subject: "Test verification", text: "A test-only message" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer canonical-fixture-key");
    const body = JSON.parse(String(options.body));
    expect(body.from).toBe("StayGuide <notifications@getstayguide.com>");
    expect(body.to).toEqual(["guest@example.test"]);
  });
});
