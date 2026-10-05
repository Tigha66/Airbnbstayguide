import { neon } from "@neondatabase/serverless";
export type Row = Record<string, unknown>;
export type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;
let override: QueryFn | null = null;
/** Tests inject an in-process Postgres (PGlite) here. */
export function setQueryOverride(fn: QueryFn | null) {
  override = fn;
}
export function dbConfigured() {
  return Boolean(override || process.env.DATABASE_URL);
}
export async function query<T = Row>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (override) return (await override(text, params)) as T[];
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const sql = neon(url);
  return (await sql.query(text, params)) as T[];
}
/** Splits schema.sql into statements (the schema has no function bodies). */
export function splitStatements(schema: string) {
  return schema
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
