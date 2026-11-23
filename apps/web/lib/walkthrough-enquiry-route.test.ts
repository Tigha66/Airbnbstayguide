import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { POST } from "../app/api/walkthrough/route";
import { query, setQueryOverride, splitStatements } from "./db";

const pg = new PGlite();
const saved = {
  flag: process.env.WALKTHROUGH_ENQUIRIES_ENABLED,
  origin: process.env.NEXT_PUBLIC_APP_URL,
  auth: process.env.AUTH_SECRET,
  vercel: process.env.VERCEL_ENV,
};

beforeAll(async () => {
  process.env.WALKTHROUGH_ENQUIRIES_ENABLED = "true";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.AUTH_SECRET = "qa-route-test-secret";
  delete process.env.VERCEL_ENV;
  setQueryOverride(async (text, params) => (await pg.query(text.replace(/\bnow\(\)/g, "'2026-12-01T12:00:00Z'::timestamptz"), params)).rows as Record<string, unknown>[]);
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))) await pg.exec(statement);
}, 30000);

afterAll(async () => {
  setQueryOverride(null);
  await pg.close();
  if (saved.flag === undefined) delete process.env.WALKTHROUGH_ENQUIRIES_ENABLED; else process.env.WALKTHROUGH_ENQUIRIES_ENABLED = saved.flag;
  if (saved.origin === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = saved.origin;
  if (saved.auth === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = saved.auth;
  if (saved.vercel === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = saved.vercel;
});

function request(input: Record<string, unknown>, ip: string) {
  return new Request("http://localhost:3000/api/walkthrough", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(input),
  });
}
const valid = { name: "QA Host", email: "qa@example.test", propertyName: "QA Flat", propertyUrl: "https://example.test/property/1", company: "" };

describe("walkthrough enquiry POST route", () => {
  it("stores a normalized valid enquiry and sends no email", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(request(valid, "192.0.2.10"));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ received: true });
    const [row] = await query<{ name: string; email: string; property_name: string; property_url: string }>(
      "SELECT name, email, property_name, property_url FROM property_walkthrough_enquiries WHERE email=$1",
      ["qa@example.test"],
    );
    expect(row).toEqual({ name: "QA Host", email: "qa@example.test", property_name: "QA Flat", property_url: "https://example.test/property/1" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects invalid email and non-HTTPS property URLs", async () => {
    expect((await POST(request({ ...valid, email: "not-an-email" }, "192.0.2.11"))).status).toBe(400);
    expect((await POST(request({ ...valid, propertyUrl: "http://example.test/property/1" }, "192.0.2.12"))).status).toBe(400);
  });

  it("silently discards honeypot submissions", async () => {
    const before = Number((await query<{ count: string }>("SELECT count(*) FROM property_walkthrough_enquiries"))[0].count);
    const response = await POST(request({ ...valid, email: "bot@example.test", company: "spam" }, "192.0.2.13"));
    expect(response.status).toBe(200);
    expect(Number((await query<{ count: string }>("SELECT count(*) FROM property_walkthrough_enquiries"))[0].count)).toBe(before);
  });

  it("limits a single source to three requests per hour", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const response = await POST(request({ ...valid, email: `rate${i}@example.test` }, "192.0.2.14"));
      statuses.push(response.status);
    }
    expect(statuses).toEqual([201, 201, 201, 429]);
  });
});
