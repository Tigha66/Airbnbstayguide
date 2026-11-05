import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailDeliveryError, mailerConfigured, sendEmail } from "./mailer";

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "fixture-secret");
  vi.stubEnv("EMAIL_FROM", "StayGuide <account@example.test>");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const message = { to: "host@example.test", subject: "Verify your email", text: "private verification link" };
describe("transactional email delivery", () => {
  it("uses the configured sender and bounds provider calls", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":"accepted"}'));
    vi.stubGlobal("fetch", fetcher);
    expect(mailerConfigured()).toBe(true);
    await sendEmail(message);
    expect(fetcher).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST", signal: expect.any(AbortSignal),
      body: JSON.stringify({ from: "StayGuide <account@example.test>", to: [message.to], subject: message.subject, text: message.text }),
    }));
  });
  it("reports a safe provider code without leaking response content or retrying", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "validation_error", message: "private verification link host@example.test fixture-secret" }), { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    const error = await sendEmail(message).catch(error => error);
    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(error.message).toBe("Email provider rejected delivery (403, validation_error)");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not echo unknown provider error names", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"name":"fixture-secret"}', { status: 401 })));
    await expect(sendEmail(message)).rejects.toThrow("401, provider_error");
  });
  it("fails closed when the sender is missing", async () => {
    vi.stubEnv("EMAIL_FROM", ""); vi.stubEnv("RESEND_FROM_EMAIL", ""); vi.stubEnv("RESEND_FROM", "");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(mailerConfigured()).toBe(false);
    await expect(sendEmail(message)).rejects.toThrow("Email is not configured");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
