# StayGuide release status

Updated: 2026-10-06

## Current state

StayGuide is a web beta with production integrations wired in source. It can run in browser-only demo mode without credentials, and it can run as a connected SaaS when the required environment variables are configured.

Implemented in the recovered web app:

- Marketing, pricing, demo, blog, draft legal, status, login, dashboard, and guest guide routes.
- Guest guide PWA with install manifest and offline guide caching.
- Google sign-in through Auth.js.
- Neon Postgres persistence with host-owned data scoped by `owner_id`.
- AI guide builder and AI concierge through Hugging Face by default, with OpenAI-compatible, OpenAI, and Anthropic options.
- Keyword fallback when AI is not configured or fails.
- Host inbox escalation and guest-visible host replies.
- Per-plan property limits, AI monthly usage counters, and public endpoint rate limits.
- Stripe subscriptions, Customer Portal, signed webhooks, plan mapping by lookup key, and property-count quantity sync.
- Stripe Connect Express onboarding and destination-charge extras with 5% platform fee.
- Manual capture for approval-required extras, decline/cancel, and refund flow.
- Resend host notifications for escalated guest questions and extra requests.
- Optional monitoring webhook plus status reporting for monitoring configuration.
- Unit/repository/billing tests covering 30 assertions across shared and web packages.

## Verified in this sandbox

- `pnpm install --frozen-lockfile`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed.
- `next build`: completed. On very high core-count machines the default worker count can exhaust memory during page-data collection; limiting workers (for example `experimental.cpus`) avoids it.
- Playwright browser E2E against `next build && next start`: all 7 tests passed, including signed-out billing → sign-in links, offline guest guide reload, fail-closed endpoints, and mobile viewport.
- Note: the offline-reload test fails under `next dev` because dev chunks are not reliably cached; run offline checks against a production build, as Next.js recommends.

See `docs/TECHNICAL_LAUNCH_AUDIT.md` for details and log locations.

## External owner actions still required

These cannot be completed by source changes alone:

- Activate/approve Stripe Connect for the platform account.
- Run a real live-mode Connect pilot with an onboarded host, paid extra, manual capture, decline, and refund.
- Configure DNS/custom domain and production OAuth redirect URLs.
- Rotate any secrets that were shared during development.
- Add real production credentials in Vercel for Neon, Auth, AI, Stripe, Resend, and monitoring.
- Review final terms, privacy policy, refund policy, support process, taxes, and operator details with a qualified reviewer.
- Move `docs/ci.workflow.yml` to `.github/workflows/ci.yml` when GitHub workflow permissions allow it.

## Remaining product gaps

- iOS host app is not present in the recovered repository and must be rebuilt separately.
- Push notifications are not implemented.
- Per-stay access codes/private credential reveal are not implemented.
- Photo uploads, maps/nearby-place management, team members, and advanced imports remain future work.
- Lighthouse/accessibility certification has not been completed.

## Launch recommendation

Use the current web app for a closely supported beta with a few pilot hosts after production credentials are configured and a Vercel build completes. Do not run broad public paid acquisition until live Connect payments, email deliverability, monitoring, legal/domain setup, and browser E2E are verified.
