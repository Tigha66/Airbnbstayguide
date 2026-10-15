# TurnoverProof billing reliability upgrade

Prepared 15 October 2026 against default-branch source tree
`ca956b4e5f39e54fd62ca51a9154090fb801d359` from Tigha66/turnoverproof.

## Delivery status

This sandbox's Git repository is Tigha66/Airbnbstayguide. This directory contains
a reviewable patch for TurnoverProof; it does **not** change TurnoverProof's remote
repository or production deployment. No branches were created or switched. No
live accounts, database records or Stripe settings were changed.

## What changes

- Record a Stripe webhook receipt only after its idempotent subscription update
  succeeds. A failed retrieval/update leaves the event retryable.
- Distinguish a genuine duplicate receipt (`23505`) from database outages.
- Stop silently acknowledging organization lookup/update failures or missing
  organization records.
- Stop acknowledging subscription checkout fulfillment while Stripe is missing.
- Handle expanded subscription objects in checkout events.
- Stop checkout if its newly created Stripe customer cannot be linked to the
  organization's database record.
- Add 12 regression tests against the actual TypeScript billing service with
  isolated database/Stripe adapters. They make no network calls or payments.

## Validation performed

- Original service: **2 passed, 10 failed** against the regression suite.
- Patched service: **12 passed, 0 failed**.
- `git apply --check` succeeded against a pinned original-source fixture.
- Full app install, typecheck, build, live Stripe integration, tenant isolation
  and browser workflows were **not** tested. TypeScript transpilation in the
  regression runner does not replace typechecking.

Logs: `/tmp/logs/turnoverproof-billing-before.log` and
`/tmp/logs/turnoverproof-billing-after.log`.

## Applying in the TurnoverProof repository

With a clean TurnoverProof working tree matching the reviewed source, copy the
patch there and run:

```bash
git apply --check billing-reliability.patch
git apply billing-reliability.patch
node --test scripts/test-billing-regressions.cjs
npm run typecheck
npm test
npm run build
```

The test runner uses the project's existing TypeScript dev dependency; it does
not need another test package. The patch requires no database migration. Existing
`stripe_events` rows are treated as completed receipts. If the old code previously
recorded a failed event, this patch cannot infer that from the old row: reconcile
affected subscriptions and replay only confirmed failures through an authenticated,
controlled process. Do not delete receipts indiscriminately.

## Important limits and next work

The receipt and organization update are not one database transaction. If a process
crashes between them, Stripe can safely replay the subscription state update. Two
concurrent successful deliveries can both update before one wins the receipt
insert. This is at-least-once state application, not exactly-once execution. Avoid
adding non-idempotent side effects to this handler without additional safeguards.
Ordering of *different* subscription events is not solved by event-ID deduplication.

A failed customer-link database write can leave an orphan Stripe Customer; this
patch prevents unlinked checkout but does not make customer provisioning atomic.

Other findings from source review:

1. `src/lib/db/browser.ts` imports `clientEnv` from an environment module whose
   top-level `serverEnv` initializer throws when evaluated in a browser. Split
   browser-safe configuration from server-secret validation and verify client
   bundling before launch. This needs a separate patch and full build review.
2. Completion/offline handling needs concurrent replay and interrupted-upload
   testing before being certified for real cleaning teams.
3. Runbook claims about CI, seed scripts and E2E coverage need verification against
   actual files; a documented command alone does not prove those checks exist.
4. A deployed URL and a test environment are needed for signup, photo evidence,
   approvals, report delivery, cancellation and paid-entitlement walkthroughs.

The product is **not certified fully functional** by this upgrade.
