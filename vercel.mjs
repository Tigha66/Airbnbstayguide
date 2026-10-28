// Cron registration is a separate production rollout action. Keeping it off
// lets Hobby and preview builds run without purchasing a hosting upgrade.
const enableScheduledDelivery = process.env.VERCEL_ENV === "production" &&
  process.env.STAYGUIDE_VERCEL_CRON_ENABLED === "true";

export const config = {
  framework: "nextjs",
  installCommand: "corepack pnpm install --frozen-lockfile",
  buildCommand: "corepack pnpm --filter @stayguide/web build",
  outputDirectory: ".next",
  crons: enableScheduledDelivery
    ? [{ path: "/api/cron/pms-delivery", schedule: "*/5 * * * *" }]
    : [],
};
