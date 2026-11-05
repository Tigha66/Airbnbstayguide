import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET, POST, PATCH } from "../app/api/v1/manager/outbox/route";
const mocks = vi.hoisted(() => ({ host: vi.fn(), origin: vi.fn(), access: vi.fn(), limit: vi.fn(), list: vi.fn(), connections: vi.fn(), create: vi.fn(), approve: vi.fn(), cancel: vi.fn(), pause: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/api", () => ({ safeOrigin: mocks.origin, parseJson: (s: string) => JSON.parse(s) }));
vi.mock("@/lib/repo", () => ({ hasManagerAccess: mocks.access, consumeRateLimit: mocks.limit }));
vi.mock("@/lib/pms-outbox", () => ({ listOutbox: mocks.list, listPmsConnections: mocks.connections, createOutboxDraft: mocks.create, approveOutbox: mocks.approve, cancelOutbox: mocks.cancel, pausePmsConnection: mocks.pause }));
const id = "11111111-1111-4111-8111-111111111111";
const request = (body: string) => new Request("https://example.test/api/v1/manager/outbox", { method: "POST", body });
beforeEach(() => {
  vi.resetAllMocks(); mocks.origin.mockReturnValue(true); mocks.host.mockResolvedValue({ user: { id: "owner", emailVerified: true } });
  mocks.access.mockResolvedValue(true); mocks.limit.mockResolvedValue(true); mocks.list.mockResolvedValue([]); mocks.connections.mockResolvedValue([]);
});
describe("PMS outbox API", () => {
  it("requires same-origin writes, verified login and entitlement", async () => {
    mocks.origin.mockReturnValue(false); expect((await POST(request("{}"))).status).toBe(403); expect(mocks.host).not.toHaveBeenCalled();
    mocks.origin.mockReturnValue(true); mocks.host.mockResolvedValue({ response: NextResponse.json({}, { status: 401 }) });
    expect((await GET()).status).toBe(401);
    mocks.host.mockResolvedValue({ user: { id: "owner", emailVerified: false } }); expect((await GET()).status).toBe(403);
    mocks.host.mockResolvedValue({ user: { id: "owner", emailVerified: true } }); mocks.access.mockResolvedValue(false);
    expect((await PATCH(request('{"action":"cancel"}'))).status).toBe(403); expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("reports missing migrations and disconnected delivery without leaking internals", async () => {
    const r = await GET(); expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(await r.json()).toMatchObject({ deliveryAvailable: false, connections: [] });
    mocks.list.mockRejectedValue(new Error("private database details")); expect((await GET()).status).toBe(503);
  });
  it("rejects malformed and injected approval actions; binds approval to signed-in owner and hash", async () => {
    for (const body of ["{", JSON.stringify({ action: "approve", id }), JSON.stringify({ action: "cancel", id, ownerId: "other" })]) expect((await PATCH(request(body))).status).toBe(400);
    mocks.approve.mockResolvedValue(true);
    expect((await PATCH(request(JSON.stringify({ action: "approve", id, contentHash: "a".repeat(64) })))).status).toBe(200);
    expect(mocks.approve).toHaveBeenCalledWith("owner", id, "a".repeat(64));
  });
  it("limits draft creation and returns conflicts without sending", async () => {
    mocks.limit.mockResolvedValue(false); expect((await POST(request("{}"))).status).toBe(429); expect(mocks.create).not.toHaveBeenCalled();
    mocks.limit.mockResolvedValue(true); mocks.create.mockResolvedValue(null); expect((await POST(request("{}"))).status).toBe(409);
    mocks.cancel.mockResolvedValue(false); expect((await PATCH(request(JSON.stringify({ action: "cancel", id })))).status).toBe(409);
  });
});
