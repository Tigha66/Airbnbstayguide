import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/v1/properties/[id]/whatsapp/route";
import { normaliseWhatsAppNumber } from "./whatsapp";

const mocks = vi.hoisted(() => ({ host: vi.fn(), origin: vi.fn(), owned: vi.fn(), limit: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/api", () => ({ safeOrigin: mocks.origin, parseJson: JSON.parse }));
vi.mock("@/lib/repo", () => ({ getOwnedProperty: mocks.owned, consumeRateLimit: mocks.limit }));
vi.mock("@/lib/origin", () => ({ applicationOrigin: () => "https://www.getstayguide.com" }));
const context = { params: Promise.resolve({ id: "guide-1" }) };
const request = (body = { phone: "+44 7901 921642", consent: true }) => new Request("https://www.getstayguide.com/api/v1/properties/guide-1/whatsapp", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OPENWA_HOST_EMAILS", "owner@example.test");
  vi.stubEnv("OPENWA_API_KEY", "test-key");
  vi.stubEnv("OPENWA_SESSION_ID", "session-1");
  vi.stubEnv("OPENWA_BASE_URL", "https://gateway.example.test");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.host.mockResolvedValue({ user: { id: "owner-1", email: "owner@example.test" } });
  mocks.origin.mockReturnValue(true);
  mocks.owned.mockResolvedValue({ status: "published", name: "Sea View", slug: "sea-view" });
  mocks.limit.mockResolvedValue(true);
});

describe("WhatsApp guest guide sending", () => {
  it("normalises international numbers and rejects local numbers", () => {
    expect(normaliseWhatsAppNumber("0044 7901 921642")).toBe("447901921642");
    expect(normaliseWhatsAppNumber("07901921642")).toBeNull();
    expect(normaliseWhatsAppNumber("4479@example.test")).toBeNull();
  });
  it("requires same-origin requests and an enabled sender account", async () => {
    mocks.origin.mockReturnValue(false);
    expect((await POST(request(), context)).status).toBe(403);
    mocks.origin.mockReturnValue(true);
    mocks.host.mockResolvedValue({ user: { id: "other", email: "other@example.test" } });
    expect((await POST(request(), context)).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("checks consent, ownership and publication before contacting the gateway", async () => {
    expect((await POST(request({ phone: "447901921642", consent: false }), context)).status).toBe(400);
    mocks.owned.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(404);
    mocks.owned.mockResolvedValue({ status: "draft" });
    expect((await POST(request(), context)).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("sends the owned guide URL through the server with one gateway call", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ success: true }));
    expect((await POST(request(), context)).status).toBe(200);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(String(url)).toBe("https://gateway.example.test/api/sessions/session-1/messages/send-text");
    expect(JSON.parse(options.body)).toMatchObject({ chatId: "447901921642@c.us", text: expect.stringContaining("https://www.getstayguide.com/g/sea-view") });
    expect(options.headers["X-API-Key"]).toBe("test-key");
  });
  it("blocks concurrent or repeated attempts using the database reservation", async () => {
    mocks.limit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await POST(request(), context)).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("reports ambiguous gateway errors without retrying or claiming failed delivery", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ success: false, error: "Internal server error" }, { status: 400 }));
    const response = await POST(request(), context);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ status: "unknown" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});
