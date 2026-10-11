import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { query } from "./db";
import { consumeRateLimit } from "./repo";

const ttlMinutes = 10;

export function emailLoginConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.AUTH_EMAIL_FROM || process.env.RESEND_FROM_EMAIL));
}

function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

function hashCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? "stayguide"}:${email}:${code}`)
    .digest("hex");
}

function codesMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function sendCode(email: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new Error("Email login is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your StayGuide sign-in code",
      text: `Your StayGuide sign-in code is ${code}. It expires in ${ttlMinutes} minutes.`,
      html: `<p>Your StayGuide sign-in code is <strong>${code}</strong>.</p><p>It expires in ${ttlMinutes} minutes.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Could not send sign-in email: ${res.status}`);
}

export async function requestEmailLoginCode(emailInput: unknown) {
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
  const allowed = await consumeRateLimit(`email-login:${email}`, 5, 15 * 60);
  if (!allowed) throw new Error("Too many sign-in code requests. Please try again later.");
  const code = String(randomInt(100000, 1000000));
  await query(
    `INSERT INTO email_login_codes (email, code_hash, expires_at, attempts, created_at)
     VALUES ($1, $2, now() + make_interval(mins => $3), 0, now())
     ON CONFLICT (email) DO UPDATE SET
       code_hash = EXCLUDED.code_hash,
       expires_at = EXCLUDED.expires_at,
       attempts = 0,
       created_at = now()`,
    [email, hashCode(email, code), ttlMinutes],
  );
  await sendCode(email, code);
  return email;
}

export async function consumeEmailLoginCode(emailInput: unknown, codeInput: unknown) {
  const email = normalizeEmail(emailInput);
  const code = String(codeInput ?? "").trim();
  if (!email || !/^\d{6}$/.test(code)) return null;
  const [row] = await query<{ code_hash: string; attempts: number }>(
    `SELECT code_hash, attempts FROM email_login_codes WHERE email = $1 AND expires_at > now()`,
    [email],
  );
  if (!row) return null;
  if (Number(row.attempts) >= 5) {
    await query(`DELETE FROM email_login_codes WHERE email = $1`, [email]);
    return null;
  }
  if (codesMatch(row.code_hash, hashCode(email, code))) {
    await query(`DELETE FROM email_login_codes WHERE email = $1`, [email]);
    return { email };
  }
  await query(`UPDATE email_login_codes SET attempts = attempts + 1 WHERE email = $1`, [email]);
  return null;
}
