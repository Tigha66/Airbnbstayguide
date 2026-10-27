# StayGuide Manager rollout (unified GuestPulse capabilities)

## Scope in this preview
- One StayGuide deployment and database, without a separate GuestPulse customer app.
- Manager plan: USD $199/month flat for 1–50 properties, USD $1,990/year. Stripe quantity always 1.
- Existing property guides, concierge, extras, analytics and host inbox reused.
- Host inbox now filters across portfolio properties.
- Enabled keyword automations triage incoming guide-chat messages into urgent/normal categories.
- Triage open/resolved status, owner-scoped rules and tenant isolation; rules are disabled initially.
- Manager saved replies (up to 30 per owner): create, edit by API, delete and select in the host inbox composer. Hosts review and explicitly send them; there is no automatic outbound delivery.
- Does not send guest messages or enable integrations in the background.

## Release gate
1. Run standard lint, typecheck, unit tests, production build and browser tests in CI.
2. Review the Neon recovery point. Only then run the explicitly gated schema migration in a safe staging branch. Confirm legacy data survives.
3. Create/review the Stripe Manager recurring Prices and portal configuration. Check Manager lookup keys and the Stripe signing secret in a sandbox. Do not add Manager as an unrestricted plan-switch option in the Stripe portal: Stripe portal changes could bypass the 50-property eligibility check. Manager users may manage payment methods and cancel, but tier changes require a server-enforced eligibility path.
4. Verify checkout, signed webhooks, subscription cancellation, past-due lockout, fixed quantity, 50-property limit and no downgrade access leakage.
5. Test two separate hosts: manager rules, guest chat classification, reply visibility and cross-tenant rejection.
6. Check mobile and desktop dashboard, including 50-property inbox performance and rule collisions.
7. Promote only the tested reviewed release after acceptance. Production stays unchanged until that point.

## Later increments (not sold as live yet)
1. PMS adapters with distinct OAuth scopes for Hospitable and Guesty; signature-verified, replay-protected webhooks, guest/channel IDs, idempotent message normalization and pull reconciliation.
2. Operator-reviewed templates and consent-aware pre-arrival / checkout / upsell sequence scheduler, time zone handling, quiet hours and delivery audit.
3. Shared team permissions, assignment/SLA, dispute/maintenance escalation, provider outage queues, and staff notification controls.
4. Revenue attribution from accepted upsells (not offers sent), comprehensive analytics, onboarding and iOS Manager screens.

**Never infer that reservation messages are delivered from the existing guide-chat inbox; that is a separate integration.**

## 27 October reliability follow-up

Implemented in `finish-guestpulse-20261027`:
- Rule editing with owner/plan validation, duplicate-keyword errors and automatic disabling after edits.
- Literal, case-insensitive previews share their matcher with execution; previews never write messages or triage entries.
- Queue status/priority filters, refresh/retry, urgent-first ordering, and protection against normal messages downgrading open urgent issues.
- Owner row locks enforce 20-rule/30-reply limits under concurrent creation.
- Per-conversation reply drafts, repeated-send protection while pending, and draft preservation on network failures.
- Inbox deep links retrieve an owned conversation beyond the latest 50. Malformed reply JSON returns 400.

Read-only deployment evidence on 27 October:
- `www.getstayguide.com` serves `f0599413372e25a0db24edadd8c41eb7641ad3c0`, preceding Manager.
- Manager preview `stayguide-ibq0r2uac-hajabdelhak66.vercel.app` serves `e3880b1180babd4ebdab566bf232b762d726cd15`; its health endpoint reports database/accounts unavailable.
- Information-schema inspection confirms the shared configured database is reachable but lacks `session_version`, `billing_event_created`, and all three `portfolio_*` tables. The migration is unapplied.
- The connected Neon account does not list the project owning that endpoint. No production schema/customer data was changed. Do not substitute an unrelated app database.
- The public release reports account email unavailable; delivery remains unverified on the candidate.

Launch gates remain: verified recovery/isolated restore, explicit migration in the correct project, sandbox billing lifecycle, delivered account emails and deployed authenticated desktop/mobile acceptance. PMS syncing, scheduled reservation messages, shared staff permissions and delivery audit still require implementation.

New browser regressions use mocked APIs, not live providers. Local Chromium installation failed because the downloaded archive was empty/invalid; browser results are not claimed as passed.
