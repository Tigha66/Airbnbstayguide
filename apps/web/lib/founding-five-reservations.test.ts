import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { reserveFoundingFiveCustomer } from "./founding-five-reservations";

const pg = new PGlite();
const owners = Array.from({ length: 9 }, () => crypto.randomUUID());

beforeAll(async () => {
  setQueryOverride(async (text, params) =>
    (await pg.query(text, params)).rows as Record<string, unknown>[],
  );
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")))
    await pg.exec(statement);
  for (const [index, owner] of owners.entries()) {
    await query("INSERT INTO users(id,email,plan) VALUES ($1,$2,'free')", [owner, `founding-${index}@example.test`]);
    await query(
      "INSERT INTO properties(id,owner_id,slug,status,data,published_at) VALUES ($1,$2,$3,'published','{}',now())",
      [`founding-property-${index}`, owner, `founding-property-${index}`],
    );
  }
  await query(
    "INSERT INTO properties(id,owner_id,slug,status,data,published_at) VALUES ($1,$2,$3,'published','{}',now())",
    ["founding-property-0-second", owners[0], "founding-property-0-second"],
  );
});

afterAll(async () => {
  setQueryOverride(null);
  await pg.close();
});

it("reserves at most five customer places under parallel requests and blocks repeat purchases", async () => {
  const results = await Promise.all(owners.slice(0, 8).map((owner, index) =>
    reserveFoundingFiveCustomer(owner, `founding-property-${index}`),
  ));
  expect(results.filter((result) => result.reserved)).toHaveLength(5);
  expect(results.filter((result) => !result.reserved && result.reason === "limit")).toHaveLength(3);
  expect((await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM founding_five_offer_reservations WHERE status='pending'",
  ))[0].count).toBe(5);

  const duplicate = await reserveFoundingFiveCustomer(owners[0], "founding-property-0-second");
  expect(duplicate).toMatchObject({ reserved: false, reason: "duplicate", activeCustomers: 5, maxCustomers: 5 });
});

it("releases a place after an unpaid reservation expires", async () => {
  await query(
    "UPDATE founding_five_offer_reservations SET expires_at=now()-interval '1 minute' WHERE owner_id=$1",
    [owners[0]],
  );
  const replacement = await reserveFoundingFiveCustomer(owners[8], "founding-property-8");
  expect(replacement.reserved).toBe(true);
  expect(replacement.activeCustomers).toBe(5);
});
