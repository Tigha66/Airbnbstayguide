import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { PATCH } from "../app/api/v1/manager/rules/[id]/route";
import { POST as reply } from "../app/api/v1/inbox/[threadId]/route";

const mocks = vi.hoisted(() => ({ host: vi.fn(), origin: vi.fn(), edit: vi.fn(), enable: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/api", () => ({ safeOrigin: mocks.origin, parseJson: (body: string) => JSON.parse(body) }));
vi.mock("@/lib/repo", () => ({ updatePortfolioRule: mocks.edit, setPortfolioRuleEnabled: mocks.enable, deletePortfolioRule: vi.fn(), hostReply: mocks.send }));
const id = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id }) };
const request = (body: string) => new Request("https://example.test/api/v1/manager/rules/" + id, { method: "PATCH", body });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.origin.mockReturnValue(true);
  mocks.host.mockResolvedValue({ user: { id: "owner", plan: "manager" } });
  mocks.edit.mockResolvedValue({ id });
});
describe("Manager API boundaries", () => {
  it("requires same-origin writes, authentication and a Manager entitlement", async () => {
    mocks.origin.mockReturnValue(false);
    expect((await PATCH(request('{"enabled":true}'), params)).status).toBe(403);
    expect(mocks.host).not.toHaveBeenCalled();
    mocks.origin.mockReturnValue(true);
    mocks.host.mockResolvedValue({ response: NextResponse.json({}, { status: 401 }) });
    expect((await PATCH(request('{"enabled":true}'), params)).status).toBe(401);
    mocks.host.mockResolvedValue({ user: { id: "owner", plan: "pro" } });
    expect((await PATCH(request('{"enabled":true}'), params)).status).toBe(403);
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(mocks.enable).not.toHaveBeenCalled();
  });
  it("rejects malformed and ambiguous edits, and handles duplicate keywords", async () => {
    for (const body of ["{", '{"enabled":true,"keyword":"leak","label":"Maintenance","priority":"urgent"}'])
      expect((await PATCH(request(body), params)).status).toBe(400);
    mocks.edit.mockRejectedValue({ code: "23505" });
    expect((await PATCH(request('{"keyword":"leak","label":"Maintenance","priority":"urgent"}'), params)).status).toBe(409);
    expect(mocks.edit).toHaveBeenCalledWith("owner", id, { keyword: "leak", label: "Maintenance", priority: "urgent" });
  });
  it("rejects malformed replies without sending anything", async () => {
    expect((await reply(request("{"), { params: Promise.resolve({ threadId: id }) })).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
