import { neon } from "@neondatabase/serverless";
export type Row = Record<string, unknown>;
export type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;
let override: QueryFn | null = null;
/** Tests inject an in-process Postgres (PGlite) here. */
export function setQueryOverride(fn: QueryFn | null) {
  override = fn;
}
/**
 * The database to use. Vercel Preview deployments only get one through PREVIEW_DATABASE_URL, never
 * the production DATABASE_URL (without it a preview runs as the browser-only demo).
 */
export function databaseUrl(env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL_ENV === "preview") return env.PREVIEW_DATABASE_URL || undefined;
  return env.DATABASE_URL || undefined;
}
export function dbConfigured() {
  return Boolean(override || databaseUrl());
}
export async function query<T = Row>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (override) return (await override(text, params)) as T[];
  const url = databaseUrl();
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
