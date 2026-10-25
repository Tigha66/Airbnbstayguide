import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { registerPasswordUser, authenticatePassword } from "./password-login";
import { getUser } from "./repo";
import { originFromHeaders, requestPasswordReset, resetPassword, sendVerificationEmail, verifyEmailToken } from "./account-email";
const pg = new PGlite();
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
let delivered = "";
let user: { id: string; email: string };
beforeAll(async () => {
  vi.stubEnv("AUTH_SECRET", "isolated-account-lifecycle-test-secret");
  vi.stubEnv("RESEND_API_KEY", "test-fixture-only");
  vi.stubEnv("EMAIL_FROM", "StayGuide <account@example.test>");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.getstayguide.com");
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    delivered = JSON.parse(String(init?.body)).text;
    return new Response(JSON.stringify({ id: "fixture-delivery" }), { status: 200 });
  }));
  setQueryOverride(async (text, params) => (await pg.query(text, params)).rows as Record<string, unknown>[]);
  for (const statement of splitStatements(schema)) await pg.exec(statement);
  user = await registerPasswordUser({ name: "Test Host", email: "lifecycle@example.test", password: "First-password-2026!" });
}, 30000);
afterAll(async () => { setQueryOverride(null); vi.unstubAllEnvs(); vi.unstubAllGlobals(); await pg.close(); });
const deliveredToken = () => new URL(delivered.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
describe("account ownership and recovery", () => {
  it("never verifies a password account merely because the schema is reapplied", async () => {
    for (const statement of splitStatements(schema)) await pg.exec(statement);
    expect((await getUser(user.id))?.emailVerified).toBe(false);
  });
  it("does not trust a forwarded host for account email destinations", () => {
    expect(originFromHeaders(new Headers({ "x-forwarded-host": "attacker.test", "x-forwarded-proto": "http" }))).toBe("https://www.getstayguide.com");
  });
  it("verifies once using the delivered token and refuses replay", async () => {
    await sendVerificationEmail({ userId: user.id, email: user.email, origin: "https://www.getstayguide.com" });
    const token = deliveredToken();
    expect(await verifyEmailToken(token)).toBe(true);
    expect(await verifyEmailToken(token)).toBe(false);
    expect((await getUser(user.id))?.emailVerified).toBe(true);
  });
  it("resets the password, invalidates other reset links and revokes older sessions", async () => {
    await requestPasswordReset({ email: user.email, origin: "https://www.getstayguide.com" });
    const older = deliveredToken();
    await requestPasswordReset({ email: user.email, origin: "https://www.getstayguide.com" });
    const current = deliveredToken();
    expect((await authenticatePassword({ email: user.email, password: "First-password-2026!" }))?.sessionVersion).toBe(0);
    await resetPassword({ token: current, password: "Second-password-2026!" });
    expect(await authenticatePassword({ email: user.email, password: "First-password-2026!" })).toBeNull();
    expect((await authenticatePassword({ email: user.email, password: "Second-password-2026!" }))?.sessionVersion).toBe(1);
    await expect(resetPassword({ token: current, password: "Third-password-2026!" })).rejects.toThrow();
    await expect(resetPassword({ token: older, password: "Third-password-2026!" })).rejects.toThrow();
    expect(Number((await query("SELECT count(*) AS count FROM account_email_tokens WHERE user_id=$1 AND purpose='reset_password' AND used_at IS NULL", [user.id]))[0].count)).toBe(0);
  });
});
