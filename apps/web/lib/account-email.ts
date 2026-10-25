import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { dbConfigured, query } from "./db";
import { consumeRateLimit } from "./repo";
import { mailerConfigured, sendEmail, supportEmail } from "./mailer";
import { applicationOrigin } from "./origin";

const derive = promisify(scrypt);
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12).max(128);

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

export function originFromHeaders(_headers: Headers) {
  void _headers;
  return applicationOrigin();
}

async function createToken({
  purpose,
  email,
  userId = null,
  expiresMinutes,
}: {
  purpose: "verify_email" | "reset_password";
  email: string;
  userId?: string | null;
  expiresMinutes: number;
}) {
  const token = newToken();
  await query(
    `INSERT INTO account_email_tokens (purpose, user_id, email, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5::int * interval '1 minute'))`,
    [purpose, userId, email, tokenHash(token), expiresMinutes],
  );
  return token;
}

export async function sendVerificationEmail(input: { userId: string; email: string; origin: string }) {
  if (!dbConfigured() || !mailerConfigured()) return false;
  const email = emailSchema.parse(input.email);
  if (!await consumeRateLimit(`verify-email:${email}`, 3, 900)) throw new Error("Try again later");
  const token = await createToken({ purpose: "verify_email", email, userId: input.userId, expiresMinutes: 60 * 24 });
  const url = `${input.origin}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Verify your StayGuide email",
    text: `Welcome to StayGuide.\n\nVerify your email address here:\n${url}\n\nThis link expires in 24 hours. If you did not create a StayGuide account, you can ignore this message.\n\nSupport: ${supportEmail}`,
  });
  return true;
}

export async function verifyEmailToken(token: string) {
  if (!dbConfigured()) return false;
  const [row] = await query<{ id: string; user_id: string | null; email: string }>(
    `WITH redeemed AS (
       UPDATE account_email_tokens SET used_at = now()
       WHERE token_hash = $1 AND purpose = 'verify_email' AND used_at IS NULL AND expires_at > now()
       RETURNING user_id, email
     ) UPDATE users u SET email_verified_at = now()
       FROM redeemed r WHERE u.id = r.user_id AND u.email = r.email
       RETURNING u.id, u.id AS user_id, u.email`,
    [tokenHash(token)],
  );
  if (!row?.user_id) return false;
  return true;
}

async function passwordHash(password: string, salt: string) {
  return await derive(password, salt, 64) as Buffer;
}

export async function requestPasswordReset(input: { email: unknown; origin: string }) {
  if (!dbConfigured() || !mailerConfigured()) return false;
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) return true;
  const email = parsed.data;
  if (!await consumeRateLimit(`reset:${email}`, 3, 900)) return true;
  const [user] = await query<{ id: string; password_hash: string | null }>(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [email],
  );
  if (!user?.password_hash) return true;
  const token = await createToken({ purpose: "reset_password", email, userId: user.id, expiresMinutes: 60 });
  const url = `${input.origin}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Reset your StayGuide password",
    text: `Reset your StayGuide password here:\n${url}\n\nThis link expires in 1 hour. If you did not request it, no action is needed.\n\nSupport: ${supportEmail}`,
  });
  return true;
}

export async function resetPassword(input: { token: unknown; password: unknown }) {
  const token = z.string().min(20).max(256).parse(input.token);
  const password = passwordSchema.parse(input.password);
  if (!dbConfigured()) throw new Error("Accounts unavailable");
  const salt = randomBytes(32).toString("hex");
  const hash = `${salt}:${(await passwordHash(password, salt)).toString("hex")}`;
  // Compare the session version while holding the user row update lock. Even
  // two different valid reset links cannot both win a concurrent password reset.
  const [changed] = await query<{ id: string }>(
    `WITH candidate AS (
       SELECT t.user_id, u.session_version FROM account_email_tokens t
       JOIN users u ON u.id = t.user_id AND u.email = t.email
       WHERE t.token_hash = $1 AND t.purpose = 'reset_password' AND t.used_at IS NULL AND t.expires_at > now()
     ), changed AS (
       UPDATE users u SET password_hash = $2, email_verified_at = COALESCE(u.email_verified_at, now()), session_version = u.session_version + 1
       FROM candidate c WHERE u.id = c.user_id AND u.session_version = c.session_version RETURNING u.id
     ), consumed AS (
       UPDATE account_email_tokens SET used_at = now()
       WHERE user_id IN (SELECT id FROM changed) AND purpose = 'reset_password' AND used_at IS NULL RETURNING id
     ) SELECT id FROM changed`,
    [tokenHash(token), hash],
  );
  if (!changed) throw new Error("Reset link is invalid or expired");
}

export async function tokenLooksValid(token: string, purpose: "verify_email" | "reset_password") {
  const [row] = await query<{ token_hash: string }>(
    `SELECT token_hash FROM account_email_tokens WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash(token), purpose],
  );
  // Use a tiny constant-time comparison to keep the check shape similar when a row exists.
  const actual = Buffer.from(row?.token_hash ?? "0".repeat(64), "hex");
  const expected = Buffer.from(tokenHash(token), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
