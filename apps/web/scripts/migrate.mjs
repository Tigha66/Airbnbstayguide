// Applies db/schema.sql to the database (Neon). Idempotent; runs during Vercel builds.
// Preview deployments never touch production: they migrate PREVIEW_DATABASE_URL if it's set and
// skip otherwise (the app uses the same rule at runtime, see lib/db.ts).
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
const preview = process.env.VERCEL_ENV === "preview";
const url = preview ? process.env.PREVIEW_DATABASE_URL : process.env.DATABASE_URL;
if (!url) {
  console.log(
    preview
      ? "[migrate] Vercel Preview build without PREVIEW_DATABASE_URL: skipping (previews never use the production database)."
      : "[migrate] DATABASE_URL not set; skipping (demo mode).",
  );
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
