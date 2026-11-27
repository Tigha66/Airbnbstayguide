import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { setQueryOverride, splitStatements } from "./db";
import { managerCheckoutEnabled, managerSchemaReady } from "./manager-release";

describe("Manager commercial checkout safety gate", () => {
  it("requires an exact explicit opt-in; never enables implicitly", () => {
    const previous = process.env.STAYGUIDE_MANAGER_CHECKOUT_ENABLED;
    try {
      delete process.env.STAYGUIDE_MANAGER_CHECKOUT_ENABLED;
      expect(managerCheckoutEnabled()).toBe(false);
      process.env.STAYGUIDE_MANAGER_CHECKOUT_ENABLED = "TRUE";
      expect(managerCheckoutEnabled()).toBe(false);
      process.env.STAYGUIDE_MANAGER_CHECKOUT_ENABLED = "true";
      expect(managerCheckoutEnabled()).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.STAYGUIDE_MANAGER_CHECKOUT_ENABLED;
      else process.env.STAYGUIDE_MANAGER_CHECKOUT_ENABLED = previous;
    }
  });

  it("refuses Manager checkout until the actual database has migrated", async () => {
    const pg = new PGlite();
    try {
      setQueryOverride(async (sql, params) => (await pg.query(sql, params as unknown[])).rows as Record<string, unknown>[]);
      expect(await managerSchemaReady()).toBe(false);
      const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
      for (const statement of splitStatements(schema)) await pg.exec(statement);
      expect(await managerSchemaReady()).toBe(true);
    } finally {
      setQueryOverride(null);
      await pg.close();
    }
  });
});
