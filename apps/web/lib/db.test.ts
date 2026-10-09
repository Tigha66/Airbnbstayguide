import { describe, expect, it } from "vitest";
import { databaseUrl } from "./db";

describe("databaseUrl", () => {
  it("uses DATABASE_URL in production and development", () => {
    expect(databaseUrl({ DATABASE_URL: "postgres://prod" })).toBe("postgres://prod");
    expect(databaseUrl({ VERCEL_ENV: "production", DATABASE_URL: "postgres://prod" })).toBe("postgres://prod");
    expect(databaseUrl({})).toBeUndefined();
  });
  it("never gives a Vercel preview the production database", () => {
    expect(databaseUrl({ VERCEL_ENV: "preview", DATABASE_URL: "postgres://prod" })).toBeUndefined();
    expect(databaseUrl({ VERCEL_ENV: "preview", DATABASE_URL: "postgres://prod", PREVIEW_DATABASE_URL: "postgres://preview" })).toBe("postgres://preview");
  });
});
