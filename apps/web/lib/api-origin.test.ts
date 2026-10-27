import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeOrigin } from "./api";
import { applicationOrigin } from "./origin";

const immutable = "https://stayguide-deployment.vercel.app";
const branch = "https://stayguide-git-qa-owner.vercel.app";
function request(origin: string, site = "same-origin", host = branch) {
  return new Request(`${host}/api/v1/billing/checkout`, {
    method: "POST", headers: { origin, cookie: "session=fixture", "sec-fetch-site": site },
  });
}
beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_URL", "stayguide-deployment.vercel.app");
  vi.stubEnv("VERCEL_BRANCH_URL", "stayguide-git-qa-owner.vercel.app");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.getstayguide.com");
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated preview mutation origins", () => {
  it("accepts the current deployment and its Vercel branch alias", () => {
    expect(safeOrigin(request(branch))).toBe(true);
    expect(safeOrigin(request(immutable, "same-origin", immutable))).toBe(true);
    expect(applicationOrigin()).toBe(immutable);
  });
  it("rejects foreign previews, production origins, forged hosts and cross-site requests", () => {
    for (const origin of ["https://foreign.vercel.app", "https://www.getstayguide.com", "https://evil.test", `${branch}.evil.test`, "null"])
      expect(safeOrigin(request(origin, "same-origin", origin === "null" ? branch : origin))).toBe(false);
    expect(safeOrigin(request(branch, "cross-site"))).toBe(false);
  });
  it("does not trust the preview alias in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(safeOrigin(request(branch))).toBe(false);
    expect(safeOrigin(request("https://www.getstayguide.com"))).toBe(true);
  });
  it("rejects malformed alias configuration and cookie requests without Origin", () => {
    for (const value of ["https://stayguide-git-qa-owner.vercel.app", "evil.test", "x.vercel.app/path", "x.vercel.app:443"] ) {
      vi.stubEnv("VERCEL_BRANCH_URL", value);
      expect(safeOrigin(request(branch))).toBe(false);
    }
    expect(safeOrigin(new Request(`${branch}/api/v1/account`, { headers: { cookie: "session=fixture" } }))).toBe(false);
  });
});
