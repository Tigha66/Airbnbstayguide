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

## Migration and recovery

Builds no longer migrate a shared database. Schema adds `organization`, `session_version`, `billing_event_created`, event receipt/risk alert tables and a unique partial Stripe-customer index. Before migration inspect duplicate non-null Stripe customer bindings and resolve ambiguity without discarding customer records. Confirm an isolated restore and record a verified recovery point. Use a separate staging database.

For the explicit migration only, supply the intended `DATABASE_URL`, `STAYGUIDE_ALLOW_MIGRATIONS=true`, and `STAYGUIDE_RECOVERY_POINT`, then run `pnpm --filter @stayguide/web db:migrate`. Do not keep migration flags enabled in runtime. No customer migration, restore or plan/verification backfill was performed for this candidate. Historical verified records are preserved; suspected legacy auto-verifications require an owner-reviewed remediation rather than a blanket account update.

## Provider and operator release gates

Configure the exact canonical `NEXT_PUBLIC_APP_URL`, Auth.js providers/trusted callbacks and a verified Resend sender (`EMAIL_FROM`, `RESEND_FROM_EMAIL` or `RESEND_FROM`). Confirm actual verification/resend/reset inbox receipt and session revocation on a second device. Test two independent hosts, property limits, edit/publish/QR/offline guides, guest chat and host responses with authorized sample data.

Use Stripe test mode, matching exact-deployment webhook secret, reviewed Starter/Pro monthly/yearly price IDs and a portal configuration with cancellation enabled. The catalogue must match the USD pricing shown in the app. Verify signup → checkout → signed activation → access, duplicate checkout, payment failure/recovery, cancellation and old-event replay. Review private `billing_alerts` on refund/dispute/fraud events. Operator setup script is blocked in live mode unless explicitly allowed; webhook rotation must preserve the old endpoint until replacement verification.

For paid guest extras, complete Stripe Connect platform responsibilities and host onboarding; verify charge/payout readiness, manual authorization/approval, capture, decline, expiry, refund and application-fee behavior. Subscription readiness does not prove Connect payouts. Confirm the AI provider/model and data terms, real guide-based answers and a spending limit. Approve legal operator identity, support ownership, specific retention/recovery and cancellation/refund terms before live selling.

## Validation and rollback

`pnpm install --frozen-lockfile --ignore-scripts`, `pnpm --filter @stayguide/web test`, `pnpm --filter @stayguide/web lint`, `pnpm --filter @stayguide/web build`.
PGlite tests use an isolated database; email delivery is mocked. Source tests/build do not prove inbox delivery, Stripe lifecycle, Connect payouts or deployed browser flows. Restore and provider acceptance remain open.

Roll back the application deployment to the previous retained release. Keep additive columns/tables and all customer records; do not run destructive reverse migrations. Confirm the old release can read the preserved schema before promotion.
