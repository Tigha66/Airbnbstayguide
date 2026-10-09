// Applies db/schema.sql to DATABASE_URL (Neon). Idempotent; runs during Vercel builds.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set; skipping (demo mode).");
  process.exit(0);
}
// Preview deployments (pull requests, branches) must not change the production database.
// Give Preview its own DATABASE_URL in Vercel and set MIGRATE_ON_PREVIEW=1 to migrate it.
if (process.env.VERCEL_ENV === "preview" && process.env.MIGRATE_ON_PREVIEW !== "1") {
  console.log("[migrate] Vercel Preview build: skipping database changes (set MIGRATE_ON_PREVIEW=1 if Preview has its own database).");
  process.exit(0);
}
const sql = neon(url);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
for (const statement of statements) await sql.query(statement);
console.log(`[migrate] Applied ${statements.length} statements.`);
