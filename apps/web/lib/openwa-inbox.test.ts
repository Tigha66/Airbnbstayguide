import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { invitation } from "./openwa-inbox";
import { POST as webhook } from "../app/api/v1/whatsapp/webhook/route";
import { GET, POST } from "../app/api/v1/whatsapp/inbox/route";
import { POST as syntheticQa } from "../app/api/v1/whatsapp/qa-synthetic/route";
const aiMock = vi.hoisted(() => ({
  system: "",
  user: "",
}));
vi.mock("@/lib/ai", () => ({
  aiConfigured: () => true,
  generateJson: async (system: string, user: string) => {
    aiMock.system = system;
    aiMock.user = user;
    return JSON.stringify({ reply: "Check-out is at 10:00." });
  },
}));
const auth = vi.hoisted(() => ({
  user: { id: "", email: "owner@example.test", emailVerified: true },
}));
vi.mock("@/lib/session", () => ({ requireHost: async () => auth }));
const pg = new PGlite();
const guest = "12025550101",
  sender = "12025550102",
  secret = "a".repeat(32);
const owner = crypto.randomUUID();
beforeAll(async () => {
  setQueryOverride(
    async (text, params) =>
      (await pg.query(text, params)).rows as Record<string, unknown>[],
  );
  for (const sql of splitStatements(
    readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"),
  ))
    await pg.exec(sql);
  await query("INSERT INTO users (id,email) VALUES ($1,$2)", [
    owner,
    auth.user.email,
  ]);
  await query(
    "INSERT INTO properties (id,owner_id,slug,data) VALUES ('qa',$1,'qa','{}')",
    [owner],
  );
  auth.user.id = owner;
  for (const [k, v] of Object.entries({
    OPENWA_PILOT_GUEST: guest,
    OPENWA_PILOT_SENDER: sender,
    OPENWA_WEBHOOK_SECRET: secret,
    OPENWA_HOST_EMAILS: auth.user.email,
    OPENWA_SESSION_ID: "qa",
    OPENWA_BASE_URL: "https://example.test",
    OPENWA_API_KEY: "qa",
  }))
    vi.stubEnv(k, v);
});
afterAll(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setQueryOverride(null);
  await pg.close();
});
function event(
  body: string,
  id = crypto.randomUUID(),
  from = guest,
  sign = secret,
) {
  const raw = JSON.stringify({
    event: "message.received",
    sessionId: "qa",
    data: {
      body,
      id,
      from: from + "@c.us",
      chatId: from + "@c.us",
      to: sender + "@c.us",
      type: "chat",
      isGroup: false,
      fromMe: false,
      timestamp: Math.floor(Date.now() / 1000),
    },
  });
  return webhook(
    new Request("https://example.test/hook", {
      method: "POST",
      body: raw,
      headers: {
        "X-OpenWA-Signature":
          "sha256=" + createHmac("sha256", sign).update(raw).digest("hex"),
      },
    }),
  );
}
it("binds consent to the property, authenticates callbacks, deduplicates and isolates dashboard replies", async () => {
  const invite = await invitation(owner, "qa", guest);
  const code = invite!.match(/JOIN ([a-f0-9]+)/)![1];
  expect(
    (await event("JOIN " + code, crypto.randomUUID(), guest, "wrong")).status,
  ).toBe(401);
  await query(
    "INSERT INTO properties (id,owner_id,slug,data) VALUES ('other',$1,'other','{}')",
    [owner],
  );
  expect(await invitation(owner, "other", guest)).toBeNull();
  await event("before consent");
  await event("JOIN " + code);
  await event("unrelated", crypto.randomUUID(), "12025550109");
  const id = crypto.randomUUID();
  await event("Test question", id);
  await event("Test question", id);
  const inbox = await (await GET()).json();
  expect(inbox.messages).toHaveLength(1);
  expect(inbox.messages[0].unread).toBe(true);
  const gateway = vi
    .fn()
    .mockResolvedValue(new Response("provider error", { status: 400 }));
  vi.stubGlobal("fetch", gateway);
  let key = crypto.randomUUID();
  const reply = () =>
    POST(
      new Request("https://example.test/reply", {
        method: "POST",
        body: JSON.stringify({
          action: "reply",
          id: inbox.thread.id,
          text: "Test reply",
          key,
        }),
      }),
    );
  auth.user.id = crypto.randomUUID();
  expect((await (await GET()).json()).thread).toBeNull();
  expect((await reply()).ok).toBe(false);
  expect(gateway).not.toHaveBeenCalled();
  auth.user.id = owner;
  expect(await (await reply()).json()).toEqual({ status: "unknown" });
  expect((await reply()).status).toBe(409);
  expect(gateway).toHaveBeenCalledTimes(1);
  key = crypto.randomUUID();
  gateway.mockResolvedValue(Response.json({ messageId: "outbound-id" }));
  expect(await (await reply()).json()).toEqual({ status: "accepted" });
  key = crypto.randomUUID();
  gateway.mockResolvedValue(new Response(null, { status: 401 }));
  expect(await (await reply()).json()).toEqual({ status: "failed" });
  await event("STOP");
  await event("after stop");
  expect((await (await GET()).json()).messages).toHaveLength(4);
});

it("drafts a host-reviewed suggestion from the published property guide without sending it", async () => {
  vi.stubEnv("OPENWA_AI_DRAFTS", "true");
  await query("UPDATE properties SET data=$1 WHERE id='qa'", [JSON.stringify({
    name: "QA Cottage",
    location: "Example town",
    sections: [{ title: "Checkout", body: "Check-out is at 10:00. Ask the host about bags." }],
  })]);
  const invite = await invitation(owner, "qa", guest);
  const code = invite!.match(/JOIN ([a-f0-9]+)/)![1];
  await event("JOIN " + code);
  await event("Can I leave bags after checkout?");
  const inbox = await (await GET()).json();
  const gateway = vi.fn();
  vi.stubGlobal("fetch", gateway);
  const response = await POST(new Request("https://example.test/reply", {
    method: "POST",
    body: JSON.stringify({ action: "suggest", id: inbox.thread.id }),
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ reply: "Check-out is at 10:00." });
  expect(aiMock.user).toBe("Can I leave bags after checkout?");
  expect(aiMock.system).toContain("Published guide context");
  expect(aiMock.system).toContain("Check-out is at 10:00.");
  expect(aiMock.system).toContain("do not send it");
  expect(gateway).not.toHaveBeenCalled();
});

it("runs the QA-only synthetic conversation without calling the WhatsApp gateway", async () => {
  const propertyId = crypto.randomUUID();
  await query(
    `INSERT INTO properties (id,owner_id,slug,status,data)
     VALUES ($1,$2,'qa-synthetic','published',$3::jsonb)`,
    [
      propertyId,
      owner,
      JSON.stringify({
        name: "QA WhatsApp Inbox Test",
        sections: [{ title: "SYNTHETIC QA DATA ONLY" }],
      }),
    ],
  );
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_URL", "qa.vercel.app");
  vi.stubEnv("OPENWA_QA_SYNTHETIC_TRANSPORT", "true");
  const request = (action: string) =>
    syntheticQa(
      new Request("https://qa.vercel.app/api/v1/whatsapp/qa-synthetic", {
        method: "POST",
        headers: {
          origin: "https://qa.vercel.app",
          cookie: "qa-session",
          "content-type": "application/json",
        },
        body: JSON.stringify({ action, propertyId }),
      }),
    );
  const simulatedResponse = await request("simulate");
  expect(simulatedResponse.status).toBe(200);
  const simulated = await simulatedResponse.json();
  expect(simulated).toMatchObject({
    ok: true,
    synthetic: true,
    invalidSignatureRejected: true,
    joinAccepted: true,
    messageAccepted: true,
    duplicateAcceptedWithoutDuplicate: true,
    unread: true,
    consentActive: true,
    expiryEnforced: true,
  });

  const inbox = await (await GET()).json();
  expect(inbox.synthetic).toBe(true);
  expect(inbox.messages).toHaveLength(1);
  expect(inbox.messages[0].unread).toBe(true);
  const gateway = vi.fn();
  vi.stubGlobal("fetch", gateway);
  const replyKey = crypto.randomUUID();
  const reply = await POST(
    new Request("https://qa.vercel.app/api/v1/whatsapp/inbox", {
      method: "POST",
      headers: {
        origin: "https://qa.vercel.app",
        cookie: "qa-session",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "reply",
        id: inbox.thread.id,
        key: replyKey,
        text: "Synthetic host reply",
      }),
    }),
  );
  expect(await reply.json()).toEqual({ status: "synthetic" });
  expect(gateway).not.toHaveBeenCalled();

  const markedRead = await POST(
    new Request("https://qa.vercel.app/api/v1/whatsapp/inbox", {
      method: "POST",
      headers: {
        origin: "https://qa.vercel.app",
        cookie: "qa-session",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "read",
        id: inbox.thread.id,
        message: inbox.messages[0].id,
      }),
    }),
  );
  expect(markedRead.status).toBe(204);
  expect((await (await GET()).json()).messages[0].unread).toBe(false);

  auth.user.email = "unauthorised@example.test";
  expect((await request("simulate")).status).toBe(403);
  auth.user.email = "owner@example.test";
  expect((await (await request("stop")).json()).ok).toBe(true);
  expect((await (await request("cleanup")).json()).cleaned).toBe(true);
  expect(
    (await query("SELECT id FROM properties WHERE id=$1", [propertyId])).length,
  ).toBe(0);
  vi.stubEnv("OPENWA_QA_SYNTHETIC_TRANSPORT", "false");
  expect((await request("simulate")).status).toBe(404);
  vi.stubEnv("OPENWA_QA_SYNTHETIC_TRANSPORT", "true");
  vi.unstubAllGlobals();
});
