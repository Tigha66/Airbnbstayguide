import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { setQueryOverride, splitStatements } from "./db";
import * as repo from "./repo";
import { POST } from "@/app/api/v1/guides/[slug]/extras/route";
import { GET } from "@/app/api/v1/guides/[slug]/extras/status/route";

const provider = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn() }));
vi.mock("./stripe", async (original) => ({
  ...await original<typeof import("./stripe")>(),
  stripeConfigured: () => true,
  appUrl: () => "https://guide.example.test",
  stripeClient: () => ({ checkout: { sessions: provider } }),
}));

let pg: PGlite;
let property: Awaited<ReturnType<typeof repo.createProperty>>;
const session = { id: "cs_test_" + "A".repeat(40), url: "https://checkout.stripe.com/test-fixture", status: "open" };
const guest = { guestName: "Fixture guest", guestContact: "fixture@example.test", note: "No real booking", extraId: "late" };
const extra = { id: "late", name: "Late checkout", price: 3000, description: "Stay until 2 PM", approval: true, icon: "clock" };
let failAttach = false;
const execute = async (text: string, params?: unknown[]) => {
  if (failAttach && text.startsWith("UPDATE extra_requests SET checkout_session_id")) { failAttach = false; throw new Error("Injected save failure"); }
  return (await pg.query(text, params)).rows as Record<string, unknown>[];
};
const post = (body: unknown, ip: string, raw = false) => POST(new Request("https://guide.example.test/api/extras", {
  method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: raw ? String(body) : JSON.stringify(body),
}), { params: Promise.resolve({ slug: property.slug }) });
const receipt = (slug: string, token = session.id) => GET(new Request("https://guide.example.test/api/status?session_id=" + token), { params: Promise.resolve({ slug }) });

beforeAll(async () => {
  pg = new PGlite();
  setQueryOverride(execute);
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(statement);
  const host = await repo.upsertUser("extras-fixture@example.test");
  const draft = await repo.createProperty(host, { name: "Fixture cabin", location: "Fixture location", description: "" });
  property = (await repo.updateProperty(host.id, draft.id, { ...draft, status: "published", extras: [extra] }))!;
  await repo.setStripeAccount(host.id, "acct_fixture", true);
});
beforeEach(() => {
  provider.create.mockReset().mockResolvedValue(session);
  provider.retrieve.mockReset().mockResolvedValue(session);
});
afterAll(async () => { setQueryOverride(null); await pg.close(); });

describe("guest extra checkout acceptance with isolated Postgres and simulated Stripe", () => {
  it("rejects malformed and oversized requests before writing an extra", async () => {
    expect((await post("{", "malformed", true)).status).toBe(400);
    expect((await post("x".repeat(25000), "oversized", true)).status).toBe(400);
    expect(provider.create).not.toHaveBeenCalled();
  });
  it("reuses one request and Checkout after a repeated submission", async () => {
    const body = { ...guest, requestId: crypto.randomUUID() };
    expect((await post(body, "duplicate")).status).toBe(201);
    expect((await post(body, "duplicate")).status).toBe(201);
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(provider.retrieve).toHaveBeenCalledWith(session.id);
    const rows = await pg.query("SELECT id FROM extra_requests WHERE id = $1", [body.requestId]);
    expect(rows.rows).toHaveLength(1);
    expect(provider.create.mock.calls[0][1]).toEqual({ idempotencyKey: `stayguide:extra-checkout:${body.requestId}` });
  });
  it("recovers an accepted provider call after the database save fails", async () => {
    const body = { ...guest, requestId: crypto.randomUUID() };
    const recoverySession = { ...session, id: "cs_test_" + "B".repeat(40) };
    provider.create.mockResolvedValue(recoverySession);
    failAttach = true;
    expect((await post(body, "save-failure")).status).toBe(503);
    expect((await repo.getOwnedExtraRequest((await repo.getPublishedProperty(property.slug!))!.ownerId, body.requestId))?.status).toBe("awaiting_payment");
    expect((await post(body, "save-failure")).status).toBe(201);
    // Retrying with the same payload/key cannot create another Checkout at Stripe.
    expect(provider.create.mock.calls[0]).toEqual(provider.create.mock.calls[1]);
  });
  it("refuses to reuse a submission token for changed guest details", async () => {
    const body = { ...guest, requestId: crypto.randomUUID() };
    provider.create.mockResolvedValue({ ...session, id: "cs_test_" + "C".repeat(40) });
    expect((await post(body, "changed")).status).toBe(201);
    expect((await post({ ...body, guestContact: "another@example.test" }, "changed")).status).toBe(409);
    expect(provider.create).toHaveBeenCalledTimes(1);
  });
  it("returns only verified payment state and binds receipts to their guide", async () => {
    expect((await receipt("another-guide")).status).toBe(404);
    expect((await receipt(property.slug!, "fake")).status).toBe(400);
    let response = await receipt(property.slug!);
    expect(await response.json()).toEqual({ status: "processing" });
    expect(response.headers.get("cache-control")).toContain("no-store");
    await repo.settleExtraCheckout(session.id, "pending", "pi_fixture");
    response = await receipt(property.slug!);
    expect(await response.json()).toEqual({ status: "authorized" });
    const owner = (await repo.getPublishedProperty(property.slug!))!.ownerId;
    const [row] = (await pg.query<{ id: string }>("SELECT id FROM extra_requests WHERE checkout_session_id = $1", [session.id])).rows;
    await repo.setExtraRequestStatus(owner, row.id, "paid", "pending");
    expect(await (await receipt(property.slug!)).json()).toEqual({ status: "paid" });
    expect(provider.create).not.toHaveBeenCalled();
  });
});
