import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { registerPasswordUser, authenticatePassword } from "../lib/password-login";
import * as repo from "../lib/repo";

// Existing customer databases are explicitly refused. Credentials arrive on
// stdin, stay in memory, and are never logged. No provider email/AI/payment calls.
const reader = createInterface({ input: process.stdin });
const input = JSON.parse((await reader[Symbol.asyncIterator]().next()).value!);
reader.close();
const url = new URL(input.databaseUrl);
assert.equal(url.pathname, "/stayguide_qa");
assert.match(url.hostname, /^ep-frosty-fire-b7c0esut(?:-pooler)?\./);
process.env.DATABASE_URL = input.databaseUrl;
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
const run = randomBytes(8).toString("hex");
const password = randomBytes(24).toString("base64url");
const result = (check: string) => console.log(JSON.stringify({ check, result: "PASS", environment: "isolated Neon QA" }));
try {
  const first = await registerPasswordUser({ name: "Isolated QA host A", email: `qa-a-${run}@example.invalid`, password });
  const second = await registerPasswordUser({ name: "Isolated QA host B", email: `qa-b-${run}@example.invalid`, password });
  const signedIn = await authenticatePassword({ email: first.email, password });
  assert.equal(signedIn?.id, first.id);
  assert.equal(signedIn.emailVerified, false);
  assert.equal(await authenticatePassword({ email: first.email, password: "Incorrect-fixture-password" }), null);
  result("password hashing/authentication; unverified state preserved");
  const owner = (await repo.getUser(first.id))!;
  assert.equal(owner.plan, "free");
  const attempts = await Promise.allSettled([
    repo.createProperty(owner, { name: "QA concurrent draft A", location: "QA fixture", description: "Private fixture; no guest access." }),
    repo.createProperty(owner, { name: "QA concurrent draft B", location: "QA fixture", description: "Private fixture; no guest access." }),
  ]);
  assert.equal(attempts.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(attempts.filter(r => r.status === "rejected").length, 1);
  const [property] = await repo.listProperties(first.id);
  assert.equal(property.status, "draft");
  assert.equal(await repo.getOwnedProperty(second.id, property.id), null);
  assert.equal((await repo.listProperties(second.id)).length, 0);
  result("real Postgres concurrent free-plan limit, private drafts and tenant isolation");
  await repo.updateProfile(first.id, { name: "QA saved profile", organization: "QA saved organization" });
  const restored = await repo.getUser(first.id);
  assert.equal(restored?.organization, "QA saved organization");
  assert.equal((await authenticatePassword({ email: first.email, password }))?.name, "QA saved profile");
  result("profile and organization persist across independent database/authentication calls");
  const extra = await repo.createExtraRequest(property.id, { id: "qa-extra", name: "QA late checkout", price: 3000 }, { name: "QA fixture guest", contact: "qa@example.invalid", note: "No real booking or payment" });
  assert.equal(await repo.setExtraRequestStatus(second.id, extra, "approved", "pending"), false);
  assert.equal(await repo.setExtraRequestStatus(first.id, extra, "approved", "pending"), true);
  assert.equal(await repo.setExtraRequestStatus(first.id, extra, "declined", "pending"), false);
  assert.equal((await repo.getOwnedExtraRequest(first.id, extra))?.status, "approved");
  assert.equal((await repo.analytics(first.id)).extrasRevenue, 0);
  result("owned extra transitions, stale-update refusal and approved requests excluded from paid revenue");
  console.log(JSON.stringify({ result: "PASS", fixturesRetained: { hosts: 2, draftProperties: 1, unpaidExtras: 1 }, limits: "Backend integration only; signup UI, OAuth, delivered email, AI, Stripe and recovery are not certified." }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", error: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message.slice(0,180) : "QA failure" }));
  process.exitCode = 1;
}
