# StayGuide

A warm, premium digital guest guide and host workspace for short-term rental hosts. **Current release: web beta with live-service integrations in source.** The web app supports demo mode without credentials and production mode with Neon, Google Auth, AI, Stripe, email, and monitoring environment variables.

## Run locally

Requires Node 22 and pnpm 10.32.1 (`corepack enable`, or use `npx pnpm@10.32.1`).

```bash
pnpm install --frozen-lockfile
pnpm --filter @stayguide/web dev
# http://localhost:3000 — marketing
# http://localhost:3000/dashboard — host demo
# http://localhost:3000/demo — guest guide
```

Copy `apps/web/.env.example` to `apps/web/.env.local` when connecting services. No credentials are required for the browser-only demo. Never place server secrets in `NEXT_PUBLIC_*` variables.

## Architecture

- `apps/web`: Next.js 16 App Router, strict TypeScript, custom CSS/Tailwind 4 tooling: marketing site, host dashboard, guest PWA (`/g/[slug]`) and `/api/v1/*`.
  - **Database:** Neon serverless Postgres (`@neondatabase/serverless`), schema in `apps/web/db/schema.sql`, applied automatically before every build.
  - **Accounts:** Auth.js (NextAuth v5) with Google sign-in, JWT sessions. Every host query is scoped by `owner_id` in `lib/repo.ts`.
  - **AI:** Vercel AI SDK against Hugging Face Inference Providers (OpenAI-compatible router) by default; any OpenAI-compatible API, OpenAI or Anthropic also work.
  - **Payments:** Stripe subscriptions, Customer Portal, signed webhooks, Connect Express onboarding, destination charges for extras, manual capture/decline/refund state transitions.
  - **Notifications and monitoring:** Resend host notifications and a generic monitoring webhook are optional production integrations.
- `packages/shared`: Zod validation, demo guides, plan limits, concierge prompt, fee calculations.

## Free-tier setup (Neon + Google + Hugging Face)

Without these variables the site runs as the browser-only demo. With them, hosts sign in and everything is stored in Neon.

1. **Neon** – create a project at [console.neon.tech](https://console.neon.tech) → *Connect* → copy the pooled connection string into `DATABASE_URL`. Tables are created on the next build, or run `pnpm --filter @stayguide/web db:migrate`.
2. **Google sign-in** – in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an *OAuth client ID* (Web application). Add the authorized redirect URI `https://<your-domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for development). Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET` (`openssl rand -base64 32`). Configure the OAuth consent screen and publish it (or add test users).
3. **Hugging Face** – create a fine-grained token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) with *Make calls to Inference Providers*, set `HF_TOKEN`. Optional `AI_MODEL` (default `meta-llama/Llama-3.3-70B-Instruct`). Free accounts get small monthly credits; when they run out, or if AI is not configured, the concierge falls back to keyword search over the guide and the guide builder falls back to the built-in manual parser.

### What works with live services

- Google sign-in/out, per-host data isolation, plan property limits, account deletion (cascades all data).
- Create properties from a pasted house manual (AI-structured, or parsed from `LABEL:` lines / headings), edit sections, extras, publish/unpublish, delete; autosave with status indicator.
- Guest links work on any device; views are counted; the guest PWA caches published guides offline.
- Concierge: answers only from the guide, cites sections, answers in the guest's language (AI mode), escalates unknown questions to the host inbox; host replies appear in the guest's chat. Per-plan monthly AI limits and Postgres rate limiting on public endpoints.
- Extras: guests send a request (name, contact, note). If Stripe and a ready Connect account are configured, paid extras go through Stripe Checkout; approval-required extras are authorized and captured only when the host approves. Without Connect, extras fall back to manual host confirmation.
- Analytics from real data: views, questions, resolution rate, approved extras revenue, top questions, AI usage.
- Host email notifications for escalated guest questions and extra requests when `RESEND_API_KEY` and `EMAIL_FROM` are configured.

## Working demo

Without accounts configured, the dashboard and guest guides run entirely in the browser (local storage), with sample properties `/g/casa-serena` and `/g/olive-grove`. Custom demo guides are visible only in the browser where they were made.

## Stripe

Stripe billing and Connect payouts are wired against the Neon schema. Price lookup keys are `stayguide_{starter|pro}_{monthly|yearly}` and are provisioned by `apps/web/scripts/stripe-setup.mts`. Connect Express must be activated in the Stripe dashboard before hosts can receive extras payouts.

## Deploy to Vercel

Set the project root directory to `apps/web`, framework to Next.js, build command `pnpm build`, and install command `cd ../.. && pnpm install --frozen-lockfile`. Include files outside the root for shared packages. Deploy from the monorepo root with the linked project:

```bash
vercel link --scope hajabdelhak66 --project stayguide
vercel --prod
```

Use environment settings for credentials. `NEXT_PUBLIC_APP_URL` must match the production origin; rebuild after changing browser-exposed settings. Configure Git integration in Vercel once GitHub access is available. The token used for deployment is excluded from source control.

## Native iOS

The Expo iOS host app is not present in this recovered repository. Rebuild it separately after the web product is stable.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @stayguide/web exec playwright install chromium
# Start production server separately, then:
pnpm test:e2e
```

GitHub Actions should run lint, type checks, unit tests, and web build once the workflow is moved into `.github/workflows`. Browser tests target the demo and deliberately check that unavailable integrations fail closed. A real signup → AI → Stripe purchase E2E needs production/test credentials and an activated Stripe Connect account. Lighthouse ≥90 has not been certified. Logs from sandbox checks are kept in `/tmp/logs`.
See [technical launch audit](docs/TECHNICAL_LAUNCH_AUDIT.md) for the latest sandbox verification results.

See [launch plan and App Store draft](docs/LAUNCH.md).
