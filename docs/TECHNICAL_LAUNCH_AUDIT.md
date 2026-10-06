# StayGuide technical launch audit

Date: 2026-10-06
Branch audited: `agent/stone-coral-pli0`
Commit audited: `024ad322242e61f13932da2376a647a41cf51534`

## Verdict

StayGuide is a credible, working web SaaS codebase with a strong beta-ready surface: marketing pages, guest guide PWA, host dashboard, authenticated APIs, Neon persistence, AI guide/concierge paths, Stripe subscription billing, Stripe Connect extras, rate limits, and unit coverage are present in source.

It is not yet broad-market launch ready without a short hardening pass. The largest launch risks are production payment validation, transactional notifications, monitoring, legal/operator readiness, documentation drift, and incomplete browser/E2E verification in this sandbox.

## Verification run

Dependencies were installed with the lockfile:

- `corepack pnpm@10.32.1 install --frozen-lockfile`
- Result: passed.
- Log: `/tmp/logs/pnpm-install.log`

Turbo verification was run with a temporary `/tmp/logs/bin/pnpm` shim because Corepack could not create `/usr/local/bin/pnpm` in this sandbox.

- `pnpm lint`
  - Result: passed.
  - Scope: `@stayguide/shared`, `@stayguide/web`.
  - Log: `/tmp/logs/lint.log`
- `pnpm typecheck`
  - Result: passed.
  - Includes `next typegen && tsc --noEmit` for the web app.
  - Log: `/tmp/logs/typecheck.log`
- `pnpm test`
  - Result: passed.
  - `packages/shared`: 6 tests passed.
  - `apps/web`: 24 tests passed across guide, repository, billing/webhook coverage.
  - Log: `/tmp/logs/test.log`
- `pnpm build`
  - Result: failed in sandbox with exit 137 during Next page-data collection.
  - The build got through migration skip, service worker build, compilation, and TypeScript, then was killed while Next reported `Collecting page data using 39 workers`.
  - This looks like sandbox memory pressure rather than a TypeScript or compile failure.
  - Log: `/tmp/logs/build.log`
- `NEXT_PRIVATE_BUILD_WORKER_COUNT=2 pnpm --filter @stayguide/web build`
  - Result: failed with the same exit 137; Next still used 39 workers.
  - Log: `/tmp/logs/build-web-workers2.log`
- `pnpm --filter @stayguide/web exec playwright install chromium`
  - Result: passed.
  - Log: `/tmp/logs/playwright-install.log`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm --filter @stayguide/web test:e2e`
  - Result: failed because the sandbox is missing Chromium runtime library `libnspr4.so`.
  - The API-only "unconfigured live endpoints fail closed" test passed.
  - Browser/UI tests could not launch Chromium.
  - Log: `/tmp/logs/e2e.log`

## Source findings

### Product surface

- The Next.js app has marketing, pricing, demo, blog, legal, status, login, dashboard, and public guest-guide routes.
- `apps/web/components/dashboard.tsx`, `guest-guide.tsx`, `marketing.tsx`, and `live.tsx` contain the core host, guest, and marketing UI.
- `apps/web/public/sw.js`, `worker/sw.ts`, and per-guide manifest route support PWA/offline behavior.
- Playwright tests cover dashboard guide creation, guest concierge citations, share kit QR generation, offline reload, unconfigured endpoint failure, and mobile viewport width, but browser launch was blocked by sandbox system libraries.

### Auth and data

- Auth.js Google login is configured in `apps/web/auth.ts`.
- Host API access uses `requireHost()` in `apps/web/lib/session.ts`.
- Neon access is centralized in `apps/web/lib/db.ts`.
- Repository queries in `apps/web/lib/repo.ts` consistently scope host-owned entities by `owner_id` for property, inbox, extras, analytics, and account operations.
- Schema is idempotent and includes users, properties, chat messages, extra requests, guide views, usage counters, rate limits, and Stripe billing/Connect fields.

### AI

- `apps/web/lib/ai.ts` supports Hugging Face, OpenAI-compatible endpoints, OpenAI, and Anthropic.
- Default Hugging Face model is `meta-llama/Llama-3.3-70B-Instruct`.
- Concierge answers are constrained to the property guide, cite section titles, and escalate unknowns.
- Guide builder instructs the model to use only host-provided text and falls back to deterministic parsing.

### Payments

- Stripe subscriptions are wired in source:
  - Checkout route: `apps/web/app/api/v1/billing/checkout/route.ts`.
  - Portal route: `apps/web/app/api/v1/billing/portal/route.ts`.
  - Webhook route: `apps/web/app/api/stripe/webhook/route.ts`.
  - Plan mapping and lookup keys: `apps/web/lib/stripe.ts`.
  - Event handling: `apps/web/lib/stripe-events.ts`.
- Stripe Connect extras are wired in source:
  - Express onboarding route: `apps/web/app/api/v1/connect/route.ts`.
  - Guest extra checkout route: `apps/web/app/api/v1/guides/[slug]/extras/route.ts`.
  - Host capture/cancel/refund route: `apps/web/app/api/v1/extra-requests/[id]/route.ts`.
- Tests cover manual capture, application fee calculation, checkout expiration, subscription events, unrelated Stripe event ignoring, and stale Stripe ID recovery.

### Fail-closed behavior

- Unconfigured auth/database/API paths return service-unavailable responses rather than silently pretending to work.
- Stripe webhook returns unavailable when Stripe is not configured.
- Guest extras fall back to manual host confirmation if Stripe checkout or Connect is unavailable.

## Launch blockers

1. Production build must complete in the deployment environment and should be reproducible locally or in CI. The sandbox build was killed by memory pressure during Next page-data collection.
2. Browser E2E and mobile viewport checks need to run in an environment with the required Chromium system libraries.
3. Stripe Connect must be verified in live mode with an actual onboarded Express account, a paid extra, manual capture, decline/cancel, and refund.
4. Transactional email is not implemented/connected; host notifications and guest follow-up depend on dashboard polling today.
5. Monitoring is missing: add Sentry or equivalent for server/client errors and PostHog or analytics for funnels.
6. Documentation is inconsistent. `README.md` and older `docs/STATUS.md` sections still say Stripe is disabled or the app is only a demo, while newer source and docs show Stripe billing/extras are wired.
7. Secrets previously shared in chat should be rotated before real customer traffic.
8. Legal/operator details, custom domain, privacy review, refund/support policies, and production contact details need final review.
9. The CI workflow is stored at `docs/ci.workflow.yml`; it should be installed as `.github/workflows/ci.yml` when repository permissions allow it.
10. The iOS host app is not present in this recovered source tree and remains out of scope for the current web launch.

## Recommended launch path

1. Treat the current app as beta-ready for a small pilot group, not a broad public launch.
2. Fix documentation drift first so sales/support material matches the source and production behavior.
3. Run the build in Vercel/CI and record build memory settings. If needed, configure the deployment environment for enough memory rather than changing app behavior blindly.
4. Run Playwright in CI or a workstation with Chromium dependencies installed.
5. Complete a live Stripe Connect pilot with one host and one real paid extra.
6. Add email notifications and monitoring before scaling beyond personally supported pilots.
7. Rotate secrets and finish legal/domain/support setup before public marketing.

