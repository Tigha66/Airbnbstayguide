# Manager owner access release — 27 October 2026

The owner account `abdelhaktirha@gmail.com` has a verified email and an active Pro subscription. This release grants Manager features independently of the billing plan. It does not change Stripe subscriptions, property limits, AI quotas, or charges.

## Configuration

`MANAGER_ACCESS_EMAILS=abdelhaktirha@gmail.com` is staged in Vercel for production and for preview branch `manager-owner-access-20261027`. Access requires a matching verified email in the database. All Manager routes and repository operations retain owner isolation and recheck the grant. Remove the email and redeploy to revoke complimentary access. Paid Manager users retain their existing access.

## Verification

- 133 tests across 21 files passed, including verified grants, unverified denials, revocation, tenant isolation, rule matching, triage, saved replies, and unchanged Pro subscription fields.
- ESLint passed. Optimized Next.js build and TypeScript compilation passed.
- A local production server passed a real HTTP workflow against an isolated PGlite PostgreSQL engine. Only the database transport was adapted; authentication, APIs, repository SQL, and persistence ran through the application. Two synthetic accounts signed in with the normal password provider. A draft property was published locally; a rule was saved disabled and then enabled; a guest message produced urgent triage; a saved reply was manually sent and read through the guest thread endpoint; resolution persisted across requests. Another account could not modify the rule, template, or conversation.
- No test guest messages, properties, subscriptions, or payments were created in the production application. No live email, AI, or Stripe credentials were used for the workflow test.
- Browser verification remains pending: the connected browser was unavailable, and local Chromium was blocked by the runtime's socket restrictions. The 28-test Playwright attempt is not a pass and must not be reported as one. Check desktop/mobile UI and real Google login before production publication.

## Publication preparation

Production schema migration was already applied with a recovery backup and original-row verification. This access change needs no additional database migration. Production configuration is staged; the public domain remains on its existing deployment until publication is approved.

Before publication, authorize the exact preview Google OAuth callback and test owner sign-in, Manager navigation, rule editing, saved-reply insertion, and mobile layout on the candidate deployment. Existing production callback `https://www.getstayguide.com/api/auth/callback/google` must remain registered. Promote the reviewed candidate using production environment configuration; verify `/dashboard/manager`, `/api/v1/me`, and `/api/v1/manager` on the custom domain. Recheck health and subscription status after release. Roll back to the previous production deployment if verification fails; do not undo the additive schema migration or alter the owner's Pro subscription.

## Scope

Manager currently provides internal keyword triage, saved replies, and a portfolio inbox with human-reviewed sending. Automatic guest messaging, PMS synchronization, and team permissions are not provided by this release. Existing-subscriber paid Manager upgrades remain a separate billing task; the UI now explains this instead of linking subscribers into a billing loop.
