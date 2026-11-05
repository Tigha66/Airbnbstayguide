import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { senderDomainReadiness } from "./mailer";

const verified = (name: string) => ({
  id: "domain_fixture", name, status: "verified", capabilities: { sending: "enabled" },
});
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_fixture_for_domain_readiness");
  vi.stubEnv("RESENDAPIKEY", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubEnv("RESEND_FROM_EMAIL", "StayGuide <hello@stayguide.app>");
  vi.stubEnv("RESEND_FROM", "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Resend account verification sender domain", () => {
  it("accepts the exact verified sender domain with outbound sending enabled", async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: [verified("stayguide.app")], has_more: false }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await senderDomainReadiness();
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("delivery");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(JSON.stringify(init)).not.toContain("hello@stayguide.app");
  });

  it("does not mistake a different verified Resend domain for the sender", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: [verified("pestproof.getstayguide.com")] })));
    expect((await senderDomainReadiness()).ok).toBe(false);
  });

  it("rejects domains not verified or disabled for sending", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      data: [{ ...verified("stayguide.app"), status: "pending" }],
    })));
    expect((await senderDomainReadiness()).ok).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      data: [{ ...verified("stayguide.app"), capabilities: { sending: "disabled" } }],
    })));
    expect((await senderDomainReadiness()).ok).toBe(false);
  });

  it("fails conservatively when domain list access is denied", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "restricted" }, { status: 403 })));
    const status = await senderDomainReadiness();
    expect(status.ok).toBe(false);
    expect(status.detail).toContain("403");
    expect(JSON.stringify(status)).not.toContain("re_fixture");
  });

  it("does not call the provider with an invalid sender", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "invalid");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await senderDomainReadiness()).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
