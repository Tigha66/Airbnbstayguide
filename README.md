# StayGuide

A warm, premium digital guest guide and host workspace: hosts sign in with Google, build guides from a pasted house manual, and guests get a mobile guide (installable, works offline) with an AI concierge and paid extras. Subscriptions and extras payments run on Stripe. **Status: in pilot.** Run the full authenticated journey (sign-in → property → guest AI chat → host reply → subscription → paid extra → refund → cancel) once with a dedicated test account before charging customers.

## Run locally

Requires Node 22 and pnpm 10.32.1 (`corepack enable`, or use `npx pnpm@10.32.1`).

```bash
pnpm install --frozen-lockfile
pnpm --filter @stayguide/web dev
# http://localhost:3000 — marketing
# http://localhost:3000/dashboard — host demo
# http://localhost:3000/demo — guest guide
```

Copy `apps/web/.env.example` to `.env.local` in the same directory when connecting services. No credentials are required for the demo. Never place server secrets in `NEXT_PUBLIC_*` variables.

## Architecture

- `apps/web`: Next.js 16 App Router, strict TypeScript, Tailwind 4: marketing site, host dashboard, guest PWA (`/g/[slug]`) and `/api/v1/*`.
  - **Database:** Neon serverless Postgres (`@neondatabase/serverless`), schema in `apps/web/db/schema.sql`, applied automatically before every build.
  - **Accounts:** Auth.js (NextAuth v5) with Google sign-in, JWT sessions. Every host query is scoped by `owner_id` in `lib/repo.ts`.
  - **AI:** Vercel AI SDK against Hugging Face Inference Providers (OpenAI-compatible router) by default; any OpenAI-compatible API, OpenAI or Anthropic also work.
  - **Payments:** Stripe Billing (per-property subscriptions) and Stripe Connect (guests pay hosts for extras; StayGuide keeps a 5% fee). Code in `lib/stripe.ts`, `lib/billing.ts`, `lib/stripe-events.ts`, routes under `/api/v1/billing`, `/api/v1/connect`, `/api/stripe/webhook`.
- There is **no native mobile app** in this repository. Hosts use the web dashboard; guests can add their guide (or the website) to the home screen, where it opens full-screen and works offline.
- `packages/shared`: Zod validation, demo guides, plan limits, concierge prompt, fee calculations.

## Free-tier setup (Neon + Google + Hugging Face)

Without these variables the site runs as the browser-only demo. With them, hosts sign in and everything is stored in Neon.

1. **Neon** – create a project at [console.neon.tech](https://console.neon.tech) → *Connect* → copy the pooled connection string into `DATABASE_URL`. Tables are created on the next build, or run `pnpm --filter @stayguide/web db:migrate`.
2. **Google sign-in** – in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an *OAuth client ID* (Web application). Add the authorized redirect URI `https://<your-domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for development). Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET` (`openssl rand -base64 32`). Configure the OAuth consent screen and publish it (or add test users).
3. **Hugging Face** – create a fine-grained token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) with *Make calls to Inference Providers*, set `HF_TOKEN`. Optional `AI_MODEL` (default `meta-llama/Llama-3.3-70B-Instruct`). Free accounts get small monthly credits; when they run out, or if AI is not configured, the concierge falls back to keyword search over the guide and the guide builder falls back to the built-in manual parser.

### What works with live services

- Google sign-in/out, per-host data isolation, plan property limits (enforced atomically), account deletion via the API (cancels the Stripe subscription first, then removes all data; there's no button in the dashboard yet).
- Create properties from a pasted house manual (AI-structured, or parsed from `LABEL:` lines / headings), edit sections, extras, publish/unpublish, delete; autosave with status indicator.
- Guest links work on any device; views are counted; the guest PWA caches published guides offline.
- Concierge: answers only from the guide, cites sections, answers in the guest's language (AI mode), escalates unknown questions to the host inbox; host replies appear in the guest's chat. Per-plan monthly AI limits and Postgres rate limiting on public endpoints.
- Extras: guests pay online by card when the host has connected Stripe payouts (or send a request to pay in person); hosts approve/capture, decline/release or refund in the dashboard.
- Billing: Starter/Pro subscriptions billed per property; the quantity follows the number of properties and is re-checked on every renewal.
- Analytics from real data: views, questions, resolution rate, approved extras revenue, top questions, AI usage.

## Working demo

Without accounts configured, the dashboard and guest guides run entirely in the browser (local storage), with sample properties `/g/casa-serena` and `/g/olive-grove`. Custom demo guides are visible only in the browser where they were made. On the live site the sample guides' concierge uses the real AI (10 answers per visitor per day, 300 per day in total), falling back to built-in answers.

## Stripe

1. Set `STRIPE_SECRET_KEY` (live or test key).
2. Run `STRIPE_SECRET_KEY=sk_... APP_URL=https://www.getstayguide.com pnpm --filter @stayguide/web stripe:setup` once. It creates the products and prices, the Customer Portal configuration and the webhook endpoint `/api/stripe/webhook`, and prints `STRIPE_WEBHOOK_SECRET` (set it in Vercel). Re-running it is safe and updates the webhook's events.
3. Webhook events used: `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`/`updated`/`deleted`, `invoice.payment_failed`, `invoice.upcoming` (re-checks the billed property count before each renewal).
4. Hosts connect payouts (Stripe Connect Express) from the dashboard before guests can pay for extras online.

Without `STRIPE_SECRET_KEY`, billing routes return 503 and the dashboard says payments aren't available.

## Cost and abuse limits

- Guest chat: 15 messages per minute per visitor; at most 10 AI answers per visitor per guide per day (then free keyword answers); each host's plan has a monthly AI allowance, and failed AI calls aren't counted.
- Guide builder and property creation: the plan's property limit is checked before any AI call; AI organising is limited to 20 per host per hour.
- Translations: 20 new translations per visitor per hour; results are cached per guide version (partial ones are retried after 6 hours).

## Deploy to Vercel

Set the project root directory to `apps/web`, framework to Next.js, build command `pnpm build`, and install command `cd ../.. && pnpm install --frozen-lockfile`. Include files outside the root for shared packages. Deploy from the monorepo root with the linked project:

```bash
vercel link --scope hajabdelhak66 --project stayguide
vercel --prod
```

Use environment settings for credentials. `NEXT_PUBLIC_APP_URL` must match the production origin; rebuild after changing browser-exposed settings. Set `NEXT_PUBLIC_VERCEL_ANALYTICS=1` only after switching on Web Analytics in the Vercel project.

**Preview deployments must not use the production database.** Database changes run during production builds; on Preview builds they're skipped unless `MIGRATE_ON_PREVIEW=1`. Give the Preview environment its own `DATABASE_URL` (e.g. a Neon branch) in Vercel → Settings → Environment Variables. Configure Git integration in Vercel once GitHub access is available. The token used for deployment is excluded from source control.

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

The CI workflow is kept at `docs/ci.workflow.yml`; copy it to `.github/workflows/ci.yml` (from the GitHub website) to run lint, type checks, unit tests and the build on every push. Browser tests run against the demo (no credentials). A real signup → AI → Stripe purchase test needs a dedicated test account. Lighthouse ≥90 has not been certified. Logs from sandbox checks are kept in `/tmp/logs`.

See [launch plan and App Store draft](docs/LAUNCH.md).
