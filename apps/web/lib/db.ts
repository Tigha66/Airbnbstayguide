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

export type Statement = { text: string; params?: unknown[] };
let testTransactionQueue: Promise<unknown> = Promise.resolve();
/** One connection and fresh Read Committed snapshots after the owner lock. */
export async function transaction(statements: Statement[]): Promise<Row[][]> {
  if (override) {
    const run = async () => {
      const execute = override!;
      await execute("BEGIN");
      try {
        const results: Row[][] = [];
        for (const statement of statements) results.push(await execute(statement.text, statement.params));
        await execute("COMMIT");
        return results;
      } catch (error) { await execute("ROLLBACK"); throw error; }
    };
    // The in-process test database has a single connection. Production uses
    // Postgres row locks across independent HTTP transaction connections.
    const pending = testTransactionQueue.then(run, run);
    testTransactionQueue = pending.catch(() => undefined);
    return pending;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  const sql = neon(process.env.DATABASE_URL);
  return await sql.transaction(statements.map(({ text, params }) => sql.query(text, params ?? [])), { isolationLevel: "ReadCommitted" }) as Row[][];
}
