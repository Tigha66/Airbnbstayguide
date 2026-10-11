import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { dbConfigured, query } from "./db";
import { consumeRateLimit } from "./repo";
import { isAdminEmail } from "./admin";

const derive = promisify(scrypt);
const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
});
export const passwordLoginConfigured = () => Boolean(process.env.AUTH_SECRET && dbConfigured());

async function passwordHash(password: string, salt: string) {
  return await derive(password, salt, 64) as Buffer;
}

export async function registerPasswordUser(input: unknown) {
  const data = credentials.extend({ name: z.string().trim().min(1).max(120) }).parse(input);
  if (!passwordLoginConfigured()) throw new Error("Accounts unavailable");
  if (isAdminEmail(data.email)) throw new Error("Use Google for this account");
  if (!await consumeRateLimit(`register:${data.email}`, 5, 900)) throw new Error("Try again later");
  const salt = randomBytes(32).toString("hex");
  const hash = `${salt}:${(await passwordHash(data.password, salt)).toString("hex")}`;
  // Never attach a password to an existing account based on an unverified email.
  const rows = await query(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [data.email, data.name, hash],
  );
  if (!rows.length) throw new Error("Account cannot be created");
}

export async function authenticatePassword(input: unknown) {
  const parsed = credentials.safeParse(input);
  if (!parsed.success || !passwordLoginConfigured()) return null;
  const { email, password } = parsed.data;
  if (isAdminEmail(email)) return null;
  if (!await consumeRateLimit(`password:${email}`, 10, 900)) return null;
  const [user] = await query<{ id: string; email: string; name: string; password_hash: string | null }>(
    `SELECT id, email, name, password_hash FROM users WHERE email = $1`, [email],
  );
  const [salt, stored] = (user?.password_hash ?? `${"0".repeat(64)}:${"0".repeat(128)}`).split(":");
  const actual = await passwordHash(password, salt);
  const expected = Buffer.from(stored, "hex");
  if (!user?.password_hash || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: user.id, email: user.email, name: user.name };
}
