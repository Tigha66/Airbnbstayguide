# StayGuide

A warm, premium digital guest guide and host workspace. **Current release: a functional demo and integration foundation, not a launch-ready paid SaaS.** No fake live payments, AI responses, or guest messages are presented as real.

## Run locally

Requires Node 22 and pnpm 10.32.1 (`corepack enable`, or use `npx pnpm@10.32.1`).

```bash
pnpm install --frozen-lockfile
pnpm --filter @stayguide/web dev
# http://localhost:3000 — marketing
# http://localhost:3000/dashboard — host demo
# http://localhost:3000/demo — guest guide
pnpm --filter @stayguide/mobile dev
```

Copy `apps/web/.env.example` to `.env.local` in the same directory when connecting services. Copy `apps/mobile/.env.example` to `.env` there. No credentials are required for the demo. Never place server secrets in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## Architecture

- `apps/web`: Next.js 16 App Router, strict TypeScript, Tailwind 4: marketing site, host dashboard, guest PWA (`/g/[slug]`) and `/api/v1/*`.
  - **Database:** Neon serverless Postgres (`@neondatabase/serverless`), schema in `apps/web/db/schema.sql`, applied automatically before every build.
  - **Accounts:** Auth.js (NextAuth v5) with Google sign-in, JWT sessions. Every host query is scoped by `owner_id` in `lib/repo.ts`.
  - **AI:** Vercel AI SDK against Hugging Face Inference Providers (OpenAI-compatible router) by default; any OpenAI-compatible API, OpenAI or Anthropic also work.
- `apps/mobile`: Expo SDK 57 native host app (still uses the earlier Supabase auth adapter; migration to the Neon API is pending).
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
- Extras: guests send a request (name, contact, note); hosts approve/decline/mark paid in the dashboard. Payment is arranged by the host for now.
- Analytics from real data: views, questions, resolution rate, approved extras revenue, top questions, AI usage.

## Working demo

Without accounts configured, the dashboard and guest guides run entirely in the browser (local storage), with sample properties `/g/casa-serena` and `/g/olive-grove`. Custom demo guides are visible only in the browser where they were made.

## Stripe (not wired yet)

Stripe billing and Connect payouts were built against the earlier Supabase schema and are disabled until moved to Neon. The webhook routes return 503 so Stripe retries rather than dropping events. `lib/webhook.ts` and the shared 5% fee helper remain tested.

## Deploy to Vercel

Set the project root directory to `apps/web`, framework to Next.js, build command `pnpm build`, and install command `cd ../.. && pnpm install --frozen-lockfile`. Include files outside the root for shared packages. Deploy from the monorepo root with the linked project:

```bash
vercel link --scope hajabdelhak66 --project stayguide
vercel --prod
```

Use environment settings for credentials. `NEXT_PUBLIC_APP_URL` must match the production origin; rebuild after changing browser-exposed settings. Configure Git integration in Vercel once GitHub access is available. The token used for deployment is excluded from source control.

## Native iOS

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init
# Set EXPO_PUBLIC_API_URL, Supabase values, and EXPO_PUBLIC_EAS_PROJECT_ID.
npx eas-cli build -p ios --profile development
npx eas-cli build -p ios --profile production --non-interactive
npx eas-cli submit -p ios --latest
```

Bundle ID: `com.tigha66.stayguide`. EAS profiles cover development, simulator preview, and production. Production signing needs an Apple Developer team. Submission needs App Store Connect access/API key. Native export is a JavaScript bundle, **not a signed IPA or a TestFlight release**. Validate entitlements, push, biometrics, camera, and Apple sign-in on hardware. Session lock is optional and does not yet auto-lock on app background. The app contains no host subscription purchase button or subscription payment link.

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

GitHub Actions runs lint, type checks, unit tests, and web/native export. Browser tests target the demo and deliberately check that unavailable payment integrations fail closed. A real signup → AI → Stripe purchase E2E needs test credentials and remaining integration implementation. Lighthouse ≥90 has not been certified. Logs from sandbox checks are kept in `/tmp/logs`.

See [launch plan and App Store draft](docs/LAUNCH.md).
