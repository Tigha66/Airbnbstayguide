// Explicit schema operation. Builds never migrate a shared customer database.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set; skipping (demo mode).");
  process.exit(0);
}
if (process.env.STAYGUIDE_ALLOW_MIGRATIONS !== "true" || !process.env.STAYGUIDE_RECOVERY_POINT?.trim()) {
  throw new Error("Migration blocked: record a verified recovery point and explicitly set STAYGUIDE_ALLOW_MIGRATIONS=true.");
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
