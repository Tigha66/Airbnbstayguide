# StayGuide: Product & Technical Overview

**StayGuide** is a SaaS for short-term rental hosts (Airbnb, Booking.com, direct). It gives each property a digital guidebook with an AI concierge, plus paid extras (upsells). Guests open the guide by link or QR code: no app or login needed, and it works offline. It answers their questions in their own language and lets them buy extras like early check-in or late checkout. Hosts pay a monthly subscription per property, and StayGuide keeps a 5% fee on extras.

- Brand: StayGuide · primary color teal `#0F766E` · tone: warm, premium, hospitality
- Status: live in production, with real accounts, database, AI and **Stripe live-mode payments**

## Links

| What | URL |
|---|---|
| Production app | https://stayguide-gamma.vercel.app |
| Service status (what's connected) | https://stayguide-gamma.vercel.app/status |
| Live AI demo guide (database-backed, real AI) | https://stayguide-gamma.vercel.app/g/sea-breeze-loft |
| Static sample guides (offline demo, keyword answers) | https://stayguide-gamma.vercel.app/g/casa-serena · https://stayguide-gamma.vercel.app/g/olive-grove |
| Public demo page | https://stayguide-gamma.vercel.app/demo |
| Host login (Google) | https://stayguide-gamma.vercel.app/login |
| Host dashboard | https://stayguide-gamma.vercel.app/dashboard |
| Plans & billing (in dashboard) | https://stayguide-gamma.vercel.app/dashboard/billing |
| Pricing | https://stayguide-gamma.vercel.app/pricing |
| Blog (3 SEO posts) | https://stayguide-gamma.vercel.app/blog |
| Terms / Privacy | https://stayguide-gamma.vercel.app/legal/terms · https://stayguide-gamma.vercel.app/legal/privacy |
| GitHub repo (private) | https://github.com/Tigha66/Airbnbstayguide (working branch `agent/storm-sharp-34j0`) |
| Hosting | Vercel project `stayguide`, team `hajabdelhak66` |

## Who it's for & value

**Hosts (customers):**
- Fewer repetitive guest messages: the AI answers 24/7 from the host's own guide and escalates anything it doesn't know to the host's inbox.
- Extra revenue: early check-in, late checkout, airport transfers and so on are paid online, and the money goes straight to the host's bank via Stripe Connect.
- 10-minute setup: paste an existing house manual and the AI turns it into organized sections.
- One guide for every channel, shared by link, QR card or an Airbnb message template.
- Analytics: views, top questions, AI resolution rate, extras revenue.

**Guests:**
- No app or login. Opens from a link or QR, installs to the home screen (PWA), works offline.
- One tap to copy the Wi-Fi password, open in Maps, or call the host or emergency services.
- An AI concierge in their language that cites the guide section it used and never makes things up.
- Buy extras with card, Apple Pay or Google Pay.

## Pricing (business model, MRR)

| Plan | Price | Limits |
|---|---|---|
| Free | $0 | 1 property, 25 AI messages/month |
| Starter | $9 per property / month | up to 20 properties, 300 AI messages/month |
| Pro | $19 per property / month | up to 100 properties, 1,500 AI messages/month, branding |

- Yearly billing = 10× monthly (2 months free).
- Subscription quantity syncs automatically with the host's number of properties.
- Platform fee: 5% of every extra sold (Stripe Connect `application_fee_amount`).
- Promotion codes are accepted at checkout (used for founding-host / beta discounts).
- Competitors: Touch Stay, Hostfully Guidebooks, Enso Connect, Airbnb's built-in guidebook. Positioning: *"the guidebook that pays for itself"*: AI concierge + paid extras for independent hosts with 1–20 properties.

## Features

### Guest guide (PWA): `/g/[slug]`
- Mobile-first, hospitality design; tabs: **Your stay · Concierge · Little extras**
- Installable: per-guide web manifest, 192/512/maskable icons, apple-touch-icon; service worker caches the guide for offline use
- Wi-Fi tap-to-copy, Open in Maps, call host/emergency
- **AI concierge (RAG over this property's guide only):** replies in the guest's language (auto-detected, 10+ languages), cites section titles, refuses unrelated tasks, and when unsure replies "I've passed your question to your host" and escalates to the host inbox. Host replies appear in the guest's chat. Rate-limited, with per-plan monthly AI limits enforced in the database. Falls back to keyword search if AI is unavailable.
- **Extras store:** if the host has finished Stripe Connect onboarding, the guest pays via Stripe Checkout. Extras that need approval are only *authorised* and captured when the host approves (decline releases the hold). Otherwise the guest sends a request for the host to confirm.

### Host dashboard: `/dashboard/*`
- Google sign-in (Auth.js); all data is scoped to the signed-in host
- **Properties:** create a property by pasting a house manual; the **AI Guide Builder** generates sections (Arrival, Wi-Fi, House rules, Appliances, Parking, Trash, Checkout, Emergency, Local tips) using only the host's text
- **Guide editor:** edit sections in markdown, reorder, live preview, publish
- **Guest inbox:** escalated AI chats; the host replies in real time (polling)
- **Extras & upsells:** manage extras; guest requests with *Approve & charge / Decline & release / Refund / Mark as paid*
- **Analytics:** views, questions, AI resolution rate, top questions, extras revenue, AI usage
- **Share kit:** guest link, printable QR card, Airbnb welcome-message template
- **Plans & billing:** choose Starter/Pro (Stripe Checkout), Manage billing (Stripe Customer Portal), **Set up payouts** (Stripe Connect Express onboarding + Express dashboard link)
- Settings, dark mode, account deletion
- Without sign-in the dashboard runs as a browser-only demo (data saved in localStorage)

### Marketing site
- `/` landing (hero with phone mockup, problem, how it works, features, extras ROI calculator, pricing slider, FAQ, CTA), `/pricing`, `/demo`, `/blog` (Airbnb welcome book template, Airbnb house manual, Increase Airbnb revenue with upsells), `/legal/terms`, `/legal/privacy`, SEO metadata, sitemap, robots

## Architecture

- **Monorepo:** Turborepo + pnpm
  - `apps/web`: Next.js 16 (App Router), TypeScript strict, React 19, custom CSS design system, lucide icons
  - `packages/shared`: plans/pricing, Zod schemas, types, i18n language list, concierge system prompt, demo data, utilities
  - `apps/mobile` (iOS host app): **planned, not in the repo.** Hosts use the web dashboard; guests can add a guide to their home screen.
- **Hosting:** Vercel (root directory `apps/web`); the build runs the DB migration, then the service-worker build, then `next build`
- **Database:** Neon Postgres (serverless driver). Schema in `apps/web/db/schema.sql` (idempotent, applied on every deploy). Tables: `users`, `properties` (guide stored as JSONB), `chat_messages`, `extra_requests`, `guide_views`, `usage_counters`, `rate_limits`. Access control is enforced in the API layer (every host query is scoped by `owner_id`).
- **Auth:** Auth.js (NextAuth v5) with the Google provider, JWT sessions
- **AI:** Vercel AI SDK through Hugging Face Inference Providers (OpenAI-compatible router), default model `meta-llama/Llama-3.3-70B-Instruct`. Configurable via `AI_PROVIDER` / `AI_MODEL` (`huggingface`, `openai-compatible` e.g. Groq, `openai`, `anthropic`). Server-side only.
- **Payments:** Stripe (live mode)
  - Products/prices identified by lookup keys `stayguide_{starter|pro}_{monthly|yearly}`, provisioned by `apps/web/scripts/stripe-setup.mts` (also creates the Customer Portal config and webhook)
  - Webhook `POST /api/stripe/webhook` (signature-verified) handles `checkout.session.completed/expired` and `customer.subscription.created/updated/deleted`. The plan is derived from the price lookup key; events from other products on the same Stripe account are ignored.
  - Connect Express destination charges + 5% application fee for extras; manual capture for approval-required extras; refunds reverse the transfer and fee
- **Tests:** Vitest (unit + repository tests on in-process Postgres via PGlite, billing/webhook tests), Playwright E2E (demo flows, offline service worker, mobile viewport)

### API (`/api/v1/*`)
`me`, `status`, `properties`, `properties/[id]`, `guide-builder`, `inbox`, `inbox/[threadId]`, `extra-requests`, `extra-requests/[id]`, `analytics`, `account`, `billing`, `billing/checkout`, `billing/portal`, `connect`, `connect/dashboard`; public guest endpoints `guides/[slug]/chat`, `guides/[slug]/extras`, `guides/[slug]/view`, `guides/[slug]/threads/[threadId]`; plus `/api/auth/*` and `/api/stripe/webhook`.

### Environment variables (names only; values live in Vercel)
`NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `HF_TOKEN`, optional `AI_PROVIDER` / `AI_MODEL` / `AI_BASE_URL` / `AI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Documented in `apps/web/.env.example`.

### Useful commands
```bash
pnpm install
pnpm --filter @stayguide/web dev            # local dev
pnpm lint && pnpm typecheck && pnpm test    # checks
pnpm --filter @stayguide/web db:migrate     # apply schema to DATABASE_URL
pnpm --filter @stayguide/web db:seed        # create /g/sea-breeze-loft demo guide
pnpm --filter @stayguide/web stripe:setup   # provision Stripe (needs STRIPE_SECRET_KEY, APP_URL)
```
Deploy: the Vercel CLI from a git-free copy (`git archive HEAD`), because Vercel Hobby blocks CLI deploys whose commit author isn't a team member.

## Current status

**Working in production:** marketing site, guest PWA (offline + installable), Google login, Neon database, AI guide builder, multilingual AI concierge with escalation, host inbox replies, extras requests, analytics, share kit, Stripe live subscriptions (checkout, portal, webhook, quantity sync).

**Not done yet / known gaps:**
1. **Stripe Connect live activation** (owner action in the Stripe dashboard). Until then online payment for extras is off and extras fall back to manual requests. The paid-extras flow has unit tests but no end-to-end run yet.
2. **Emails** (Resend: welcome, payment failed, extra purchased, escalated chat) and **push notifications**: not built.
3. **iOS host app:** planned; no code exists yet.
4. **Custom domain** (e.g. stayguide.app), real legal text review, analytics/monitoring (PostHog, Sentry).
5. Per-stay access codes for door codes/Wi-Fi, photo uploads, map with nearby places, team members: not built.
6. CI workflow is stored at `docs/ci.workflow.yml`; move it to `.github/workflows/ci.yml` via the GitHub web UI (the agent's GitHub app lacks the `workflow` scope).
7. Hugging Face free credits are small; add credit or switch provider before real traffic.
8. Secrets were shared in chat during development and should be rotated (Neon, Google, Hugging Face, Vercel, Stripe test key).
