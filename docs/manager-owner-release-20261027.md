# Manager owner access release — 27 October 2026

The owner account `abdelhaktirha@gmail.com` has a verified email and an active Pro subscription. This release grants Manager features independently of the billing plan. It does not change Stripe subscriptions, property limits, AI quotas, or charges.

## Configuration

`MANAGER_ACCESS_EMAILS=abdelhaktirha@gmail.com` is staged in Vercel for production and for preview branch `manager-owner-access-20261027`. Access requires a matching verified email in the database. All Manager routes and repository operations retain owner isolation and recheck the grant. Remove the email and redeploy to revoke complimentary access. Paid Manager users retain their existing access.

## Verification

- 141 tests across 23 files passed, including verified grants, unverified denials, revocation, tenant isolation, rule matching, triage, saved replies, and unchanged Pro subscription fields.
- ESLint passed. Optimized Next.js build and TypeScript compilation passed.
- A local production server passed a real HTTP workflow against an isolated PGlite PostgreSQL engine. Only the database transport was adapted; authentication, APIs, repository SQL, and persistence ran through the application. Two synthetic accounts signed in with the normal password provider. A draft property was published locally; a rule was saved disabled and then enabled; a guest message produced urgent triage; a saved reply was manually sent and read through the guest thread endpoint; resolution persisted across requests. Another account could not modify the rule, template, or conversation.
- No test guest messages, properties, subscriptions, or payments were created in the production application. No live email, AI, or Stripe credentials were used for the workflow test.
- All 28 Chromium acceptance tests passed in GitHub Actions on the initial access candidate (run 40569477502). The local browser limitation was resolved for automated acceptance by using CI. The owner subsequently supplied screenshots showing signed-in Manager access, enabled rule matching into urgent triage, saved replies, and a host reply delivered to the guest.
- Owner acceptance exposed a water-leak question incorrectly answered from the appliance section because of a shared bathroom keyword. The follow-up fix routes recognised water-leak reports to host attention before AI or keyword retrieval, persists escalation for the host inbox, retains Manager rule triage, and avoids consuming AI quota. New tests reproduce the exact report and verify both answer paths plus the chat API persistence/triage boundary. Ordinary appliance questions still receive guide answers. Existing chat history is preserved.

## Publication preparation

Production schema migration was already applied with a recovery backup and original-row verification. This access change needs no additional database migration. Production configuration is staged; the public domain remains on its existing deployment until publication is approved.

Before publication, verify the fresh leak response on the candidate. Owner login and host-reply delivery were confirmed on the initial access preview; a new immutable preview hostname may require its exact Google OAuth callback to be registered. Automated acceptance covers Manager navigation, rule editing, saved-reply insertion and mobile layout. Existing production callback `https://www.getstayguide.com/api/auth/callback/google` must remain registered. Promote the reviewed candidate using production environment configuration; verify `/dashboard/manager`, `/api/v1/me`, and `/api/v1/manager` on the custom domain. Recheck health and subscription status after release. Roll back to the previous production deployment if verification fails; do not undo the additive schema migration or alter the owner's Pro subscription.

## Scope

Manager currently provides internal keyword triage, saved replies, and a portfolio inbox with human-reviewed sending. Automatic guest messaging, PMS synchronization, and team permissions are not provided by this release. Existing-subscriber paid Manager upgrades remain a separate billing task; the UI now explains this instead of linking subscribers into a billing loop.
