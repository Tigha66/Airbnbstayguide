import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { authenticatePassword, registerPasswordUser } from "./password-login";
import { upsertUser } from "./repo";
import { adminEmails } from "./admin";

const pg = new PGlite();
const secret = process.env.AUTH_SECRET;
beforeAll(async () => {
  process.env.AUTH_SECRET = "test-secret";
  setQueryOverride(async (sql, params) => (await pg.query(sql, params)).rows as Record<string, unknown>[]);
  for (const sql of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(sql);
}, 30000);
afterAll(async () => {
  setQueryOverride(null);
  if (secret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = secret;
  await pg.close();
});
const password = "a long test password";
describe("password accounts", () => {
  it("registers normalized email and authenticates without an email service", async () => {
    await registerPasswordUser({ name: "Test Host", email: " Host@Example.com ", password });
    const user = await authenticatePassword({ email: "HOST@example.com", password });
    expect(user).toMatchObject({ name: "Test Host", email: "host@example.com" });
    expect(user).not.toHaveProperty("password_hash");
    const [row] = await query("SELECT password_hash FROM users WHERE email = $1", ["host@example.com"]);
    expect(row.password_hash).not.toContain(password);
    expect(await authenticatePassword({ email: "host@example.com", password: "incorrect password" })).toBeNull();
    expect(await authenticatePassword({ email: "missing@example.com", password })).toBeNull();
  });
  it("cannot overwrite an existing password or Google account", async () => {
    await expect(registerPasswordUser({ name: "Attacker", email: "host@example.com", password: "another password" })).rejects.toThrow();
    await upsertUser("google@example.com", "Google Host");
    await expect(registerPasswordUser({ name: "Attacker", email: "google@example.com", password })).rejects.toThrow();
    expect(await authenticatePassword({ email: "google@example.com", password })).toBeNull();
  });
  it("rejects weak passwords and reserved admin email addresses", async () => {
    await expect(registerPasswordUser({ name: "Host", email: "weak@example.com", password: "short" })).rejects.toThrow();
    await expect(registerPasswordUser({ name: "Host", email: adminEmails()[0], password })).rejects.toThrow();
  });
  it("rate limits password guessing", async () => {
    await registerPasswordUser({ name: "Limited", email: "limited@example.com", password });
    for (let i = 0; i < 10; i++) await authenticatePassword({ email: "limited@example.com", password: "incorrect password" });
    expect(await authenticatePassword({ email: "limited@example.com", password })).toBeNull();
  });
});
