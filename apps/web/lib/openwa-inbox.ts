import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { query } from "./db";
import { normaliseWhatsAppNumber } from "./whatsapp";

export function pilot() {
  const guestInput = syntheticTransportEnabled()
    ? "19999999999"
    : process.env.OPENWA_PILOT_GUEST || "";
  const guest = normaliseWhatsAppNumber(guestInput);
  const sender = normaliseWhatsAppNumber(process.env.OPENWA_PILOT_SENDER || "");
  const session = process.env.OPENWA_SESSION_ID;
  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  if (
    !guest ||
    !sender ||
    sender === guest ||
    !session ||
    !secret ||
    secret.length < 32
  )
    return null;
  return { guest, sender, session, secret };
}

/** Synthetic transport can only run on a Preview deployment, never Production. */
export function syntheticTransportEnabled() {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.OPENWA_QA_SYNTHETIC_TRANSPORT === "true";
}

export function enabledHost(user: { email: string; emailVerified: boolean }) {
  return (
    user.emailVerified &&
    (process.env.OPENWA_HOST_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map((s) => s.trim())
      .includes(user.email.toLowerCase())
  );
}

export async function invitation(
  owner: string,
  property: string,
  phone: string,
) {
  const cfg = pilot();
  if (!cfg || cfg.guest !== phone) return "";
  const [row] = await query<{ consent_code: string }>(
    `
    INSERT INTO whatsapp_threads (owner_id,property_id,guest,session_id) VALUES ($1,$2,$3,$4)
    ON CONFLICT (session_id,guest) DO UPDATE SET expires_at=now()+interval '24 hours',
      consent_code=EXCLUDED.consent_code, consent_at=NULL
    WHERE whatsapp_threads.owner_id=$1 AND whatsapp_threads.property_id=$2
    RETURNING consent_code`,
    [owner, property, phone, cfg.session],
  );
  if (!row) return null;
  return `\nTo share questions and replies with this property's host in GetStayGuide for 24 hours, reply JOIN ${row.consent_code}. Reply STOP to end sharing.`;
}

export function validSignature(
  raw: Buffer,
  signature: string | null,
  secret: string,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(
    createHmac("sha256", secret).update(raw).digest(),
    Buffer.from(signature.slice(7), "hex"),
  );
}

const incoming = z.object({
  sessionId: z.string(),
  event: z.literal("message.received"),
  data: z.object({
    id: z.string().min(1).max(250),
    body: z.string().trim().min(1).max(4000),
    from: z.string(),
    to: z.string(),
    chatId: z.string(),
    type: z.literal("chat"),
    fromMe: z.literal(false),
    isGroup: z.literal(false),
    timestamp: z.number().int().positive(),
  }),
});

export async function receive(value: unknown) {
  const cfg = pilot();
  const parsed = incoming.safeParse(value);
  if (!cfg || !parsed.success || parsed.data.sessionId !== cfg.session) return;
  const m = parsed.data.data;
  if (
    m.from !== cfg.guest + "@c.us" ||
    m.chatId !== m.from ||
    m.to !== cfg.sender + "@c.us"
  )
    return;
  if (Math.abs(Date.now() / 1000 - m.timestamp) > 600) return;
  const args = [cfg.session, cfg.guest];
  const scope = `session_id=$1 AND guest=$2 AND expires_at>now() AND EXISTS
    (SELECT 1 FROM properties p WHERE p.id=whatsapp_threads.property_id AND p.owner_id=whatsapp_threads.owner_id AND p.status='published')`;
  if (/^JOIN /i.test(m.body)) {
    await query(
      `UPDATE whatsapp_threads SET consent_at=now() WHERE ${scope} AND consent_code=$3 AND consent_at IS NULL`,
      [...args, m.body.slice(5)],
    );
  } else if (m.body.toUpperCase() === "STOP") {
    await query(
      `UPDATE whatsapp_threads SET consent_at=NULL,expires_at=now() WHERE ${scope}`,
      args,
    );
  } else {
    await query(
      `INSERT INTO whatsapp_messages(thread_id,event_key,role,body,status,unread,created_at)
      SELECT id,$3,'guest',$4,'received',true,to_timestamp($5) FROM whatsapp_threads WHERE ${scope}
      AND consent_at IS NOT NULL AND to_timestamp($5) >= date_trunc('second',consent_at)
      ON CONFLICT DO NOTHING`,
      [...args, m.id, m.body, m.timestamp],
    );
  }
}
