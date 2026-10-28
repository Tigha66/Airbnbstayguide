import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
const configUrl = new URL("../../../vercel.mjs", import.meta.url).href;
function config(environment: string, enabled: string) {
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `import { config } from ${JSON.stringify(configUrl)}; process.stdout.write(JSON.stringify(config));`], {
    encoding: "utf8", env: { ...process.env, VERCEL_ENV: environment, STAYGUIDE_VERCEL_CRON_ENABLED: enabled },
  }));
}
describe("Vercel scheduler rollout configuration", () => {
  it("keeps previews and normal deployments compatible with Hobby and requires explicit production opt-in", () => {
    for (const environment of ["preview", "development", ""]) {
      expect(config(environment, "true").crons).toEqual([]);
    }
    expect(config("production", "false").crons).toEqual([]);
    expect(config("production", "TRUE").crons).toEqual([]);
    const optedIn = config("production", "true");
    expect(optedIn.crons).toEqual([{ path: "/api/cron/pms-delivery", schedule: "*/5 * * * *" }]);
    expect(optedIn.framework).toBe("nextjs");
    expect(optedIn.buildCommand).toBe("corepack pnpm --filter @stayguide/web build");
  });
});
