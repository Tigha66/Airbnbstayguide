import { afterEach, describe, expect, it, vi } from "vitest";
import { applicationOrigin } from "./origin";
afterEach(() => vi.unstubAllEnvs());
describe("trusted application origins", () => {
  it("normalizes the configured destination", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", " https://www.getstayguide.com/\n");
    expect(applicationOrigin()).toBe("https://www.getstayguide.com");
  });
  it("keeps Preview links on the exact deployment", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "stayguide-test.vercel.app");
    expect(applicationOrigin()).toBe("https://stayguide-test.vercel.app");
  });
  it("refuses credentials, URL paths, query strings and insecure remote links", () => {
    for (const value of ["http://evil.test", "https://name:pass@evil.test", "https://x.test/reset", "https://x.test/?q=1", "javascript:alert(1)"]) {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", value);
      expect(applicationOrigin).toThrow();
    }
  });
});
