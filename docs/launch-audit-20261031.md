# StayGuide + integrated GuestPulse launch audit — 31 October 2026

Scope: existing StayGuide production application, not the separate GuestPulse prototype. This note records verified read-only evidence and a small code change; it does **not** certify customer launch.

## Evidence

- Vercel project `stayguide` belongs to team `hajabdelhak66`, linked to `Tigha66/Airbnbstayguide`. The most recent production deployment seen in this audit was READY at commit `f0599413372e25a0db24edadd8c41eb7641ad3c0` (27 October); READY is a build/deployment state, not an end-to-end test.
- Runtime errors still include Google Auth.js `CallbackRouteError` with `response parameter "iss" (issuer) missing`, last observed on 30 October. Check the callback URL and provider response/approved Auth.js configuration; do not disable issuer validation as a workaround.
- An AI request recently failed with HTTP 401 after a placeholder OpenAI key was supplied. This branch stops reporting common placeholder credentials as configured; it does not install or test a valid provider key.
- The 27 October owner-access release document records an applied production schema migration, successful isolated acceptance tests and Manager features released without changing the owner's Pro subscription. Do not re-run production migrations just because this branch exists.
- The connected Neon account in this audit did not list the database project. Do not substitute a different Neon database or issue direct writes.
- Some service variables are preview-branch scoped. Presence of a preview variable does not demonstrate production delivery.

## Scope that can be sold after live verification

StayGuide digital guest guides; published guest link/PWA; guest questions and grounded concierge fallback; host inbox; Manager portfolio triage rules, queue and manually reviewed saved replies. Check per-tenant authorization and real host/guest message visibility on production before enabling self-service paid marketing.

## Capabilities NOT covered by this release

Native Guesty/Hospitable PMS synchronization, scheduled outbound reservation messaging, automatic channel delivery, team permissions and audit of external delivery. These must not be marketed as live without separate implementations and provider acceptance tests.

## Remaining acceptance gates (must be evidenced, not assumed)

1. **Authentication:** fresh host registration and sign-in through password and Google on `https://www.getstayguide.com`; verify `https://www.getstayguide.com/api/auth/callback/google` is in the OAuth client's authorized redirect URIs. Reproduce and resolve the missing-`iss` error without relaxing OAuth security checks.
2. **Database:** verify owner/tenant isolation with two test host accounts against a non-production branch/clone of the actual Neon project; retain a dated recovery point. Confirm migration state, then run additive changes only if needed.
3. **Email:** configured production `RESEND_API_KEY` and verified sender; demonstrate a received verification and password-reset email at real inboxes. Never log keys or store recipient secrets in public tests.
4. **AI:** use a valid production model key; run the owner-only AI health check; verify grounded answers, safety escalations, fallback, rate limits and no private credentials in public/offline guides.
5. **Billing:** verify live Stripe account/price IDs and signed webhook on the custom domain, Manager $199 monthly fixed quantity and 50-property cap, payment failure/past-due/cancellation, refunds and portal. Do not alter existing subscriptions to test. Existing owner grant is not proof of paid onboarding.
6. **GuestPulse workflow:** send guide-chat message, trigger urgent triage, review and send a saved reply, confirm guest receipt and owner isolation. Confirm mobile navigation, offline PWA and no data loss on retries. For real PMS messaging, implement the provider adapters, verified webhooks, consent-aware schedule and delivery records before claiming integration.
7. **Release:** run lint, typecheck, unit tests, Chromium E2E and build on the exact candidate; stage production without domain assignment, test against safe accounts, then promote with rollback available. Vercel team plan must allow commercial traffic.

## This branch

- Refuses common placeholder AI provider credentials in `aiConfigured()`.
- Reports configured (not assumed functional) accounts and AI status.
- Adds configuration regression tests.

No production environment variables, subscriptions, emails, OAuth settings or database rows are changed by the branch.
