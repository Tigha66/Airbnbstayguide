import { afterEach, describe, expect, it, vi } from "vitest";
import { safeOrigin } from "./api";

const branch = "https://stayguide-isolated-qa-git-test-founding-fi-6322a7-hajabdelhak66.vercel.app";
const deployment = "stayguide-isolated-example.vercel.app";
function request(origin: string, site = "same-origin") {
  return new Request(branch + "/api/founding-five/checkout", { method: "POST", headers: { origin, "sec-fetch-site": site } });
}
afterEach(() => vi.unstubAllEnvs());
describe("QA preview origin", () => {
  it("accepts the precise QA branch and rejects foreign or cross-site requests", () => {
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("VERCEL_URL", deployment);
    expect(safeOrigin(request(branch))).toBe(true);
    expect(safeOrigin(request("https://" + deployment))).toBe(true);
    expect(safeOrigin(request("https://example.com"))).toBe(false);
    expect(safeOrigin(request(branch, "cross-site"))).toBe(false);
  });
  it("does not authorize the QA branch in production", () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.getstayguide.com");
    expect(safeOrigin(request(branch))).toBe(false);
  });
});
