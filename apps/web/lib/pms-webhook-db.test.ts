import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { splitStatements } from "./db";

describe("durable PMS event intake and safe schema rollout", () => {
  it("applies the reviewed SQL idempotently, deduplicates retries and stores no guest data", async () => {
    const pg = new PGlite();
    try {
      const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
      for (const statement of splitStatements(sql)) await pg.exec(statement);
      const command = `INSERT INTO pms_webhook_events
        (event_id, provider, event_type, external_reservation_id, payload_sha256)
        VALUES ($1, 'guesty', $2, $3, $4)
        ON CONFLICT (event_id) DO NOTHING RETURNING event_id`;
      const params = ["svix_123", "reservation.messageReceived", "res_abc", "a".repeat(64)];
      expect((await pg.query(command, params)).rows).toHaveLength(1);
      expect((await pg.query(command, params)).rows).toHaveLength(0);
      const result = await pg.query("SELECT provider, status, event_id, external_reservation_id, payload_sha256 FROM pms_webhook_events");
      expect(result.rows).toEqual([{
        provider: "guesty",
        status: "awaiting_reconciliation",
        event_id: "svix_123",
        external_reservation_id: "res_abc",
        payload_sha256: "a".repeat(64),
      }]);
      // Schema contains no message body, email or guest name columns.
      const cols = await pg.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'pms_webhook_events'");
      expect(cols.rows.some((c) => /guest|message|body|email|contact/i.test(String((c as { column_name: unknown }).column_name)))).toBe(false);
      await expect(pg.query(command, ["id_bad", "reservation.messageReceived", "abc", "invalid-digest"])).rejects.toThrow();
    } finally {
      await pg.close();
    }
  });
});
