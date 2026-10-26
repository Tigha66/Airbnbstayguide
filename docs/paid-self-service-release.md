# Paid self-service candidate — 25 October 2026

This candidate is based on the current `main` source. It is not approved for paid production sales. Keep existing customer data and the previous production release.

## Implemented

- Verified email is required for subscription checkout. Hosts can resend verification themselves. Trusted OAuth email-verification claims are persisted; unknown claims do not mark an address verified.
- Applying schema no longer verifies every password account or resets existing plans. Password reset atomically changes the password, consumes outstanding reset links and increments the session version; private APIs/admin/login all check that version.
- Canonical link destinations do not trust forwarded Host headers. Private APIs, account links and dashboard pages use no-store headers; recovery/verification do not send referrers.
- Workspace name and organization persist in Postgres rather than silently saving only to one browser. Overview statistics/activity are backed by the signed-in host's analytics/inbox; demo metrics stay in demo mode. Revenue counts paid extras, not merely approved requests.
- Checkout reads a reviewed Stripe catalogue, validates price/currency/interval, detects existing subscriptions and reuses pending matching sessions. Runtime requests no longer create products/prices or mutate the global portal configuration.
- Entitlements bind to an existing Stripe customer, not metadata user IDs. Mode checks, successful-event receipts, event watermark and subscription binding protect retries and late cancellations. Past-due/unpaid subscriptions do not receive paid entitlements. Invoice paid/failure and async checkout success are handled. Refund, dispute and fraud alerts are retained privately for review.
- Failed provider lookups cannot silently orphan an existing subscription. Account deletion is refused while a nonterminal subscription remains; cancel through Manage billing first.

New properties start as private drafts. Hosts explicitly publish after reviewing manual/AI content. Property creation locks the owner in a Read Committed transaction, checks the stored plan and inserts conditionally, so simultaneous requests cannot use a stale caller plan to exceed the property allowance. Guide-builder AI calls require a verified email, share the monthly server allowance, and have an additional ten-per-hour owner limit; the manual parser remains available. Each attempted AI guide generation uses one included AI request.

## Migration and recovery

Builds no longer migrate a shared database. Schema adds `organization`, `session_version`, `billing_event_created`, event receipt/risk alert tables and a unique partial Stripe-customer index. Before migration inspect duplicate non-null Stripe customer bindings and resolve ambiguity without discarding customer records. Confirm an isolated restore and record a verified recovery point. Use a separate staging database.

For the explicit migration only, supply the intended `DATABASE_URL`, `STAYGUIDE_ALLOW_MIGRATIONS=true`, and `STAYGUIDE_RECOVERY_POINT`, then run `pnpm --filter @stayguide/web db:migrate`. Do not keep migration flags enabled in runtime. No customer migration, restore or plan/verification backfill was performed for this candidate. Historical verified records are preserved; suspected legacy auto-verifications require an owner-reviewed remediation rather than a blanket account update.

## Provider and operator release gates

Configure the exact canonical `NEXT_PUBLIC_APP_URL`, Auth.js providers/trusted callbacks and a verified Resend sender (`EMAIL_FROM`, `RESEND_FROM_EMAIL` or `RESEND_FROM`). Confirm actual verification/resend/reset inbox receipt and session revocation on a second device. Test two independent hosts, property limits, edit/publish/QR/offline guides, guest chat and host responses with authorized sample data.

Use Stripe test mode, matching exact-deployment webhook secret, reviewed Starter/Pro monthly/yearly price IDs and a portal configuration with cancellation enabled. The catalogue must match the USD pricing shown in the app. Verify signup → checkout → signed activation → access, duplicate checkout, payment failure/recovery, cancellation and old-event replay. Review private `billing_alerts` on refund/dispute/fraud events. Operator setup script is blocked in live mode unless explicitly allowed; webhook rotation must preserve the old endpoint until replacement verification.

For paid guest extras, complete Stripe Connect platform responsibilities and host onboarding; verify charge/payout readiness, manual authorization/approval, capture, decline, expiry, refund and application-fee behavior. Subscription readiness does not prove Connect payouts. Confirm the AI provider/model and data terms, real guide-based answers and a spending limit. Approve legal operator identity, support ownership, specific retention/recovery and cancellation/refund terms before live selling.

## Validation and rollback

Extra-payment actions bind the PaymentIntent's app, extra-request ID, amount and currency before moving money. Capture, cancellation and refund use deterministic idempotency keys; retries reconcile already completed captures, canceled holds and successful full refunds. Pending refunds remain pending, and a compare-and-set database save refuses stale state changes. Offline requests also enforce valid transitions. These recovery tests use a simulated Stripe provider; live Connect acceptance remains outstanding. Email verification now redeems the token and records ownership in one atomic SQL statement, with an injected-database-failure regression proving that a failed update leaves the token usable.

Current local validation: 109 tests, ESLint, type checking and production build pass. No customer charge, refund or production schema change was performed for this follow-up.

`node --import tsx scripts/qa-database-acceptance.mts` also passed against the real isolated Neon `stayguide_qa` database: password authentication, preserved unverified state, concurrent free-plan creation (exactly one accepted), draft privacy, cross-tenant denial, persisted profile/organization and stale extra-request rejection. Credentials are supplied only on stdin; production databases are explicitly refused. Two synthetic hosts, one draft property and one unpaid extra were retained on the expiring QA branch. This backend integration does not certify the signup screen, OAuth, delivery, AI, Stripe or a restore.

`pnpm install --frozen-lockfile --ignore-scripts`, `pnpm --filter @stayguide/web test`, `pnpm --filter @stayguide/web lint`, `pnpm --filter @stayguide/web build`.
PGlite tests use an isolated database; email delivery is mocked. Source tests/build do not prove inbox delivery, Stripe lifecycle, Connect payouts or deployed browser flows. Restore and provider acceptance remain open.

Roll back the application deployment to the previous retained release. Keep additive columns/tables and all customer records; do not run destructive reverse migrations. Confirm the old release can read the preserved schema before promotion.

## 26 October follow-up

Guest translations stored on the device now include the exact source text and are ignored after a host edit, including a change to an access code. Broken or unavailable browser storage no longer prevents reading a guide or retaining an answer. Recovery and verification pages are excluded from the offline cache; activation removes older cached copies.

Extra submissions now carry a UUID retained across double taps and retries. An atomic insert binds that UUID to the guide, extra, amount and guest submission. Stripe Checkout creation uses a stable idempotency key and stable parameters; an uncertain provider/save error retains the pending online operation instead of inventing an offline payment. Returning guests see a receipt status scoped to the exact guide and opaque Checkout ID, read from state saved after provider verification. The return query alone cannot confirm payment, and a card authorization is distinct from a captured charge. No new schema is required beyond this release candidate's existing migration.

Local validation passed: 118 unit/database/provider-simulation tests, lint, TypeScript and a production build. Five additional browser regressions cover unavailable storage, forged payment returns, authorization status, legacy translations and private-page cache exclusions. The local Chromium download was unavailable, so this turn's complete browser suite is not claimed as passed locally. CI now starts its own built application and installs Chromium for the 25 isolated browser checks. External provider calls are disabled for CI.

Real deployed checks against the preceding candidate at `stayguide-cijbovg04-hajabdelhak66.vercel.app` used a synthetic, unverified QA host: password sign-in, manual guide creation, editing, persistence after reload, explicit publication, guest guide access and a guide-based checkout answer passed. The fixture is only in `stayguide_qa` on the existing QA branch, which expires on 1 November 2026. This is not a production customer or proof of delivered email, live AI or paid extras.

A read-only transaction against the original production database found seven hosts, seven properties and three extra requests, zero duplicate non-null Stripe-customer bindings, and none of the candidate's `organization`, `session_version` or `billing_event_created` user columns. No customer data was changed. The production domain still serves commit `f059941`; its status reports account email unavailable. The original production endpoint is not the accessible London Neon project's endpoint. A verified production restore, the existing candidate's explicit migration, delivered verification/reset emails, exact-account Stripe sandbox credentials and subscription/Connect cycles remain open release gates.
