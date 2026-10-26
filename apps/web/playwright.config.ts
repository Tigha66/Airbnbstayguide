import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
export default defineConfig({
  testDir: "./tests", fullyParallel: false, workers: 1, retries: 0, reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A local test invocation must start its own built app; an explicit remote URL is opt-in.
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000",
    url: baseURL, reuseExistingServer: !process.env.CI, timeout: 30000,
  },
});
