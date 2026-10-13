# Functionality assessment — 2026-10-13

Reviewed local source at commit `4e63f43` and https://www.getstayguide.com/.
The production deployment's exact source revision was not verified.

## Verdict

The web app has an active backend; the earlier claim that all production
credentials were missing is contradicted by current live observations. Full
end-to-end functionality is not yet verified. The native mobile app is absent
from this checkout, and automated checks expose incomplete translations.

## Live checks

- GET `/`, `/pricing`, `/login`, `/dashboard`, `/demo`, and `/g/casa-serena`
  returned HTTP 200. This verifies page responses, not every interactive flow.
- GET `/api/v1/status` returned `ok: true` for database, accounts, AI and payments.
  Source in `apps/web/lib/status.ts` checks Postgres with a query against `users`.
  This establishes database connectivity, not full schema or CRUD correctness.
- AI and Stripe status checks inspect configuration, not actual provider calls
  or successful charges. Stripe reports live-mode configuration.
- GET `/api/auth/providers` advertised Google and email/password authentication.
  Apple was not advertised.
- GET `/api/v1/me` reported accounts and AI enabled, with no signed-in user.
- GET `/api/v1/properties` and `/api/v1/billing` returned HTTP 401 while signed out,
  consistent with access protection.

## Source findings

- Stripe checkout, portal and webhook handlers are implemented; README claims
  that billing is disabled are outdated. Actual transactions remain unverified.
- Email verification and password reset are implemented. Production email
  delivery is not covered by the public health endpoint and was not tested.
- Inbox and guest replies use polling (`components/live.tsx` and
  `components/guest-guide.tsx`); absence of WebSockets does not mean no updates.
- `apps/mobile` does not exist, despite README instructions referencing it.
- README and release-status sections describe different historical states and
  should not be treated as an authoritative production-health assessment.

## Executed checks

Dependency installation with the frozen lockfile succeeded.

| Check | Result |
| --- | --- |
| Web TypeScript check (`next typegen && tsc --noEmit`) | Passed |
| Shared unit tests | 5 passed, 1 failed |
| Web unit/integration tests | 87 passed, 1 failed |
| Two production marketing-navigation browser tests | Blocked before execution |

Shared failure: `packages/shared/src/index.test.ts:44` expects `Reply in fr`,
but the prompt contains lowercase `reply in fr` within revised language guidance.
This is an assertion mismatch, not evidence that French AI responses fail.

Web failure: `apps/web/lib/app-i18n.test.ts:33` identifies 28 missing French
interface strings, including password login, verification, support and onboarding.
The assertion stops at French; other dictionaries were not exhaustively verified
by this failing test.

Browser execution was blocked by missing `libnspr4.so` in the sandbox. Both
selected tests failed at browser launch, not on application assertions.
Build, lint, full browser coverage and authenticated production E2E were not run.
Logs are in `/tmp/logs/stayguide-*.log`.

## Still needed to establish full functionality

Use a controlled test account and test payment environment to verify signup,
verification delivery, Google login, password reset, property creation/editing,
publication and viewing from another device, actual AI generation, escalation
and host replies, subscriptions, Connect payouts, extras payments/refunds and
webhook processing. Also verify offline behavior and responsive navigation in
a browser with the required system dependencies installed.

No production accounts, emails, charges or content were created during this
assessment. No application code was changed.
