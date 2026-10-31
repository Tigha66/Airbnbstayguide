import { afterEach, describe, expect, it, vi } from "vitest";
import { safeOrigin } from "./api";

afterEach(() => vi.unstubAllEnvs());

function postFrom(origin: string, fetchSite = "same-origin") {
  return new Request("https://stayguide-git-stayguide-neon-staging-hajabdelhak66.vercel.app/api/v1/properties", {
    method: "POST",
    headers: { origin, cookie: "session=test", "sec-fetch-site": fetchSite },
  });
}

describe("Preview API origin validation", () => {
  it("accepts the deployment URL and the Vercel-provided stable branch URL", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "stayguide-a1b2c3-hajabdelhak66.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "stayguide-git-stayguide-neon-staging-hajabdelhak66.vercel.app");
    expect(safeOrigin(postFrom("https://stayguide-a1b2c3-hajabdelhak66.vercel.app"))).toBe(true);
    expect(safeOrigin(postFrom("https://stayguide-git-stayguide-neon-staging-hajabdelhak66.vercel.app"))).toBe(true);
  });

  it("rejects unrelated origins, cross-site requests and untrusted Vercel branch hostnames", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "stayguide-a1b2c3-hajabdelhak66.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "stayguide-git-stayguide-neon-staging-hajabdelhak66.vercel.app");
    expect(safeOrigin(postFrom("https://attacker.vercel.app"))).toBe(false);
    expect(safeOrigin(postFrom("https://stayguide-git-stayguide-neon-staging-hajabdelhak66.vercel.app", "cross-site"))).toBe(false);
    vi.stubEnv("VERCEL_BRANCH_URL", "example.com");
    expect(safeOrigin(postFrom("https://example.com"))).toBe(false);
  });

  it("never accepts the preview branch origin in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.getstayguide.com");
    vi.stubEnv("VERCEL_BRANCH_URL", "stayguide-git-stayguide-neon-staging-hajabdelhak66.vercel.app");
    expect(safeOrigin(postFrom("https://www.getstayguide.com"))).toBe(true);
    expect(safeOrigin(postFrom("https://stayguide-git-stayguide-neon-staging-hajabdelhak66.vercel.app"))).toBe(false);
  });
});
