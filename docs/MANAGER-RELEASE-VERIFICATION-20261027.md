# StayGuide Manager release verification — 27 October 2026

**Release decision: HOLD. The custom domain still serves an older production deployment. Do not auto-promote this preview.**

This document records observed connector and environment state; it is not a claim
that the Manager tier or PMS messaging has been accepted for paying customers.

## Verified so far

- StayGuide project: Vercel team `hajabdelhak66`, project `prj_MgOP8m5kbMuTYAFKZHAB8G6MKZjS`; domains `getstayguide.com` and `www.getstayguide.com`.
- The Manager candidate is PR #6 on `unified-stayguide-manager-20261026`, currently a **draft** targeting `agent/paid-self-service-20261025`.
- The last checked Manager candidate passed the release-candidate GitHub Actions workflow and built a Vercel **preview**. Preview success is not proof of authenticated Manager workflows or production migrations.
- Manager subscription entitlements, limits, inbox triage and front end were implemented in the candidate branch.
- Added `lib/guest-automations.ts`: a **pure** reservation-based planning module that produces deterministic, human-review message drafts with quiet hours and tenant-specific idempotency keys. It does not ingest unverified provider events or send messages.

## Blockers: exact release gates

### 1. Production data identity / backup (NOT done)

The connected Neon organisation lists ten projects, but none has the required StayGuide `chat_messages`, `properties`, and `users` table combination. It is unsafe to choose a different project by name or guess the target from an encrypted Vercel `DATABASE_URL`.

Required: authorised access to the actual StayGuide production database. Verify the project and branch correspond to production **without exposing credentials**; create a restorable recovery snapshot and test it on an isolated branch. Apply only the reviewed schema change after this succeeds; check row counts and old accounts survive.

### 2. Live Manager billing (NOT done)

The connected Stripe account is **test mode**, named `https://ai-businessgrowth.com`. Existing StayGuide Starter and Pro QA subscriptions were found there. On 27 October 2026 we created a **test-only** StayGuide Manager product `prod_VWKOYGXn8zYEfE` and two recurring prices: $199/month `price_1UVHjUC6A1Vf4vwFnMF884IP` (`stayguide_manager_monthly_usd`) and $1,990/year `price_1UVHjWC6A1Vf4vwFybJaOoTP` (`stayguide_manager_yearly_usd`). These IDs are non-secret configuration metadata. **No real charge or live price has been created; no signed end-to-end billing test has passed.** This does not establish access to GetStayGuide's production Stripe account.

Required: confirm the correct **GetStayGuide live Stripe account** separately. The QA prices now exist; check sandbox checkout, signed webhook grants/revocations, cancellation, failed renewal, quantity one, 50-property cap, and protected billing-portal plan switches. Validate production Stripe configuration before any live checkout is enabled. Never trigger a live charge just for a test.

### 3. PMS connections and outgoing messages (NOT done)

Guesty Open API requires administrative client credentials, token caching, provider webhook subscriptions and Svix signature verification; webhooks can be duplicated or out of order. Hospitable personal API tokens are not a substitute for a multi-customer partner integration. Provider permissions and product-tier restrictions must be resolved before advertising integration.

Required: authorised Guesty/Hospitable integration(s) with tenant-bound credentials and audited, replay-safe inbound events. Map every provider reservation to an owned StayGuide property, fetch and verify current status before any delivery, and store draft/send state transactionally. Add consent, host review, quiet-hour checks, no-duplicate-channel-messages logic, cancellation checks, idempotent send retries, failures and manual fallback. No outgoing messages are enabled in this release candidate.

Relevant provider references:
- https://open-api-docs.guesty.com/docs/webhooks
- https://help.guesty.com/hc/en-gb/articles/38447188197149-Guesty-Open-API-Quick-start-and-troubleshooting
- https://help.hospitable.com/en/articles/13835861-getting-started-with-integrations
- https://help.hospitable.com/en/articles/8889852-airbnb-and-hospitable-integration-overview

### 4. Real Manager account acceptance (NOT done)

Run authenticated host tests against an isolated preview with a real, verified Manager entitlement and a second unrelated host account. Verify that `/dashboard/manager`, `/api/v1/manager`, rule CRUD and triage work, mobile view passes, unowned property/thread IDs are rejected, payment lifecycle works and each host cannot access any other host's data. No production user should be silently upgraded.

### 5. Release to custom domain (NOT done)

Once gates 1–4 pass, review the exact final SHA and the PR target relative to the production branch; do not merge the feature PR straight into an unrelated branch. Stage a **production** Vercel deployment without assigning the custom domain, smoke-test with correct production settings, then promote only that production-built artifact. Keep a rollback deployment ready, check signed-in routes and monitor 5xx/webhook errors.

## Customer-facing scope control

Do **not** market connected Guesty/Hospitable messaging, automated outbound arrival/check-out/upsells, or payment-ready Manager subscriptions as available until independently proven. Current Manager triage applies to StayGuide's guest-guide chat messages only.
