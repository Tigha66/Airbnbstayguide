import { createHmac, randomUUID } from "node:crypto";
import { z } from "zod";
import { safeOrigin } from "@/lib/api";
import { query } from "@/lib/db";
import { deleteProperty, getOwnedProperty } from "@/lib/repo";
import { enabledHost, invitation, pilot, syntheticTransportEnabled } from "@/lib/openwa-inbox";
import { requireHost } from "@/lib/session";
import { POST as webhookPost } from "../webhook/route";

const requestSchema = z.object({
  action: z.enum(["simulate", "expire", "renew", "stop", "cleanup"]),
  propertyId: z.uuid(),
});
const testName = "QA WhatsApp Inbox Test";
const testMarker = "SYNTHETIC QA DATA ONLY";

function signedMessage(input: {
  session: string;
  secret: string;
  guest: string;
  sender: string;
  body: string;
  id: string;
  signature?: string;
}) {
  const raw = JSON.stringify({
    event: "message.received",
    sessionId: input.session,
    data: {
      id: input.id,
      body: input.body,
      from: `${input.guest}@c.us`,
      to: `${input.sender}@c.us`,
      chatId: `${input.guest}@c.us`,
      type: "chat",
      fromMe: false,
      isGroup: false,
      timestamp: Math.floor(Date.now() / 1000),
    },
  });
  const signature = input.signature ?? `sha256=${createHmac("sha256", input.secret).update(raw).digest("hex")}`;
  return webhookPost(new Request("https://qa.synthetic.invalid/api/v1/whatsapp/webhook", {
    method: "POST",
    headers: { "x-openwa-signature": signature, "content-type": "application/json" },
    body: raw,
  }));
}

export async function POST(request: Request) {
  if (!syntheticTransportEnabled()) return new Response(null, { status: 404 });
  if (!safeOrigin(request)) return new Response(null, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (!enabledHost(host.user)) return new Response(null, { status: 403 });
  const cfg = pilot();
  if (!cfg) return new Response(null, { status: 503 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const { action, propertyId } = parsed.data;
  const property = await getOwnedProperty(host.user.id, propertyId);
  if (!property) return new Response(null, { status: 404 });
  if (property.name !== testName || !JSON.stringify(property.sections).includes(testMarker))
    return new Response(null, { status: 403 });

  const [thread] = await query<{ id: string; expiresAt: string | null }>(
    `SELECT id, expires_at AS "expiresAt" FROM whatsapp_threads
     WHERE owner_id=$1 AND property_id=$2 AND session_id=$3 AND guest=$4`,
    [host.user.id, propertyId, cfg.session, cfg.guest],
  );

  if (action === "cleanup") {
    if (thread) {
      await query("DELETE FROM whatsapp_messages WHERE thread_id=$1", [thread.id]);
      await query("DELETE FROM whatsapp_threads WHERE id=$1 AND owner_id=$2 AND property_id=$3", [thread.id, host.user.id, propertyId]);
    }
    const deleted = await deleteProperty(host.user.id, propertyId);
    return Response.json({ ok: true, cleaned: deleted });
  }

  if (action === "simulate") {
    if (property.status !== "published") return new Response(null, { status: 409 });
    const inviteText = await invitation(host.user.id, propertyId, cfg.guest);
    const code = inviteText?.match(/JOIN ([a-f0-9]+)/i)?.[1];
    if (!code) return new Response(null, { status: 409 });
    const [created] = await query<{ id: string; expiresAt: string }>(
      `SELECT id, expires_at AS "expiresAt" FROM whatsapp_threads
       WHERE owner_id=$1 AND property_id=$2 AND session_id=$3 AND guest=$4`,
      [host.user.id, propertyId, cfg.session, cfg.guest],
    );
    if (!created) return new Response(null, { status: 500 });

    const invalid = await signedMessage({
      session: cfg.session, secret: cfg.secret, guest: cfg.guest, sender: cfg.sender,
      body: `JOIN ${code}`, id: randomUUID(), signature: `sha256=${"0".repeat(64)}`,
    });
    const join = await signedMessage({
      session: cfg.session, secret: cfg.secret, guest: cfg.guest, sender: cfg.sender,
      body: `JOIN ${code}`, id: randomUUID(),
    });
    const eventId = `qa-synthetic:${randomUUID()}`;
    const guestQuestion = "Synthetic QA: can I leave my bags after checkout?";
    const message = () => signedMessage({
      session: cfg.session, secret: cfg.secret, guest: cfg.guest, sender: cfg.sender,
      body: guestQuestion, id: eventId,
    });
    const first = await message();
    const duplicate = await message();
    const [stored] = await query<{ count: string; unread: boolean; active: boolean }>(
      `SELECT count(m.id)::text AS count, bool_or(m.unread) AS unread,
       bool_or(t.consent_at IS NOT NULL AND t.expires_at>now()) AS active
       FROM whatsapp_threads t LEFT JOIN whatsapp_messages m ON m.thread_id=t.id
       WHERE t.id=$1 GROUP BY t.id`, [created.id],
    );
    await query("UPDATE whatsapp_threads SET expires_at=now()-interval '1 second' WHERE id=$1", [created.id]);
    const [expired] = await query<{ active: boolean }>(
      "SELECT consent_at IS NOT NULL AND expires_at>now() AS active FROM whatsapp_threads WHERE id=$1", [created.id],
    );
    await query("UPDATE whatsapp_threads SET expires_at=now()+interval '24 hours' WHERE id=$1", [created.id]);
    return Response.json({
      ok: invalid.status === 401 && join.status === 204 && first.status === 204 &&
        duplicate.status === 204 && stored?.count === "1" && stored.unread === true &&
        stored.active === true && expired?.active === false,
      synthetic: true,
      threadId: created.id,
      invalidSignatureRejected: invalid.status === 401,
      joinAccepted: join.status === 204,
      messageAccepted: first.status === 204,
      duplicateAcceptedWithoutDuplicate: duplicate.status === 204 && stored?.count === "1",
      unread: stored?.unread === true,
      consentActive: stored?.active === true,
      expiryEnforced: expired?.active === false,
      expiresAt: created.expiresAt,
    });
  }

  if (!thread) return new Response(null, { status: 404 });
  if (action === "expire" || action === "renew") {
    await query(
      action === "expire"
        ? "UPDATE whatsapp_threads SET expires_at=now()-interval '1 second' WHERE id=$1"
        : "UPDATE whatsapp_threads SET expires_at=now()+interval '24 hours' WHERE id=$1",
      [thread.id],
    );
    const [state] = await query<{ active: boolean }>(
      "SELECT consent_at IS NOT NULL AND expires_at>now() AS active FROM whatsapp_threads WHERE id=$1", [thread.id],
    );
    return Response.json({ ok: true, active: state?.active === true });
  }
  const stop = await signedMessage({
    session: cfg.session, secret: cfg.secret, guest: cfg.guest, sender: cfg.sender,
    body: "STOP", id: `qa-synthetic:${randomUUID()}`,
  });
  const [state] = await query<{ active: boolean }>(
    "SELECT consent_at IS NOT NULL AND expires_at>now() AS active FROM whatsapp_threads WHERE id=$1", [thread.id],
  );
  return Response.json({ ok: stop.status === 204 && state?.active === false, stopAccepted: stop.status === 204, active: state?.active === true });
}
