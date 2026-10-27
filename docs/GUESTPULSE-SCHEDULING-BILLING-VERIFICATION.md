# GuestPulse scheduling and billing verification — 27 October 2026

Status: implementation and isolated acceptance complete for the scheduler entrypoint;
**live scheduled PMS delivery and end-to-end deployed billing are blocked**.
No production promotion, database migration, real guest send or real-money charge occurred.

## Scheduled worker

`GET /api/cron/pms-delivery` verifies a server-only `CRON_SECRET` of at least 32
characters with constant-time digest comparison, rejects Vercel previews and
awaits the worker. `vercel.mjs` registers a five-minute cadence only when `VERCEL_ENV=production`
and `STAYGUIDE_VERCEL_CRON_ENABLED=true`. Leave that flag off on Hobby.
The five-minute cadence requires Pro/Enterprise; preview and default deployments
now register no cron and remain compatible with Hobby. No hosting upgrade was purchased. Vercel only invokes cron for production deployments.

`pms_scheduler_state` supplies a three-minute database lease around a worker with
a 120-second function limit. Each run claims at most three approved messages.
Existing outbox checks revalidate tenant, entitlement, connection state, property
mapping, approval, current provider eligibility and quiet hours before sending.
A durable heartbeat records disabled, provider-not-connected, failed and successful
runs separately. Missing adapters never produce a successful delivery heartbeat.
Manager exposes only scheduler status/timestamps, never credentials or guest data
from other accounts. Claims, retries and ambiguous outcomes retain their existing
outbox safety rules.

The deployed registry intentionally contains no provider adapter. To activate:
1. Finish authorised PMS OAuth, encrypted credential lifecycle and property/booking
   reconciliation, then register the accepted server adapter in `deliveryAdapters()`.
2. Verify backup/restore and apply reviewed additive schema, including scheduler
   state, against the correct database. Set `CRON_SECRET` privately in Vercel.
3. Verify suitable hosting, deploy the reviewed production candidate with delivery
   off, and verify the authenticated cron heartbeat.
4. Test a provider-owned test conversation, pause/cancel, duplicate ticks, quiet
   hours and failure recovery. Only then enable the global delivery flag plus
   explicit per-connection delivery consent. Production activation is separate
   from merging the source.

## Actual Stripe test-account checks

The existing account `acct_1QlVyOC6A1Vf4vwF` was used in **test mode only**:

| Check | Evidence |
| --- | --- |
| Monthly price | `price_1UVHjUC6A1Vf4vwFnMF884IP`, active, USD 19,900 cents/month |
| Annual price | `price_1UVHjWC6A1Vf4vwFybJaOoTP`, active, USD 199,000 cents/year |
| Portal | `bpc_1UUV8QC6A1Vf4vwFdbAXAkxC`: cancellation at period end; plan/quantity changes disabled |
| Test customer | `cus_VWLs1GZJlwm2wm`, no email/phone, test clock `clock_1UVJ9lC6A1Vf4vwFKGWzfJ91` |
| Subscription | `sub_1UVJAfC6A1Vf4vwFy38ReAhJ` initially active, Manager monthly, quantity one |
| Test invoice | `in_1UVJAfC6A1Vf4vwF6aQg00XX`, paid USD 19,900 cents |
| Scheduled cancellation | API confirmed `cancel_at_period_end=true`, status stayed active |
| Test cleanup | Same subscription cancelled immediately with no final invoice/proration; no active QA renewal remains |

These are Stripe API checks, **not a completed hosted Checkout/browser journey**.
No real money or real customer communication was involved. Automatic time advance
was not available through the connected tool, so actual renewal and failed-renewal
simulation remain unverified. The isolated app acceptance tests simulate those
provider states and verify the resulting database entitlements.

## Billing corrections and automated acceptance

- Manager entitlement requires a single quantity-one item with the correct USD
  amount and cadence. Unknown or malformed prices do not grant access.
- Manager price lookup checks the reviewed catalogue key. The selected billing
  portal is read and validated rather than trusting an environment ID blindly;
  unrestricted subscription switching is rejected.
- An active subscription alone is not payment evidence. The latest invoice must
  be confirmed paid before active Manager access is granted; unpaid asynchronous
  Checkout completion cannot grant access. Explicit Stripe trials remain supported.
- Manager checkout checks all portfolio, outbox and scheduler tables before any
  customer or checkout creation, alongside the existing opt-in flag.
- Isolated acceptance exercises signed webhook → provider fixture → real in-process
  Postgres → entitlement, duplicate/stale events, renewal/failure/recovery/cancel,
  customer ownership, invalid signature, fixed quantities and exact checkout inputs.

## Blocking deployed verification findings

The connected test account has **no StayGuide webhook endpoint**. Its only existing
endpoint targets a different Supabase application; it was preserved. The known
isolated QA branch `agent/paid-self-service-20261025` has an empty
`STRIPE_SECRET_KEY` entry. No production key was copied into testing.
Only a test account is connected, so the live billing account is not verified.

Configure the matching sandbox restricted key and matching webhook signing secret
on an isolated staging database, and register a publicly reachable, staging-only
Stripe endpoint for the documented lifecycle events. Do not route sandbox events
to the production database. Then verify hosted Checkout, customer portal, actual
signed webhook arrival, renewal, failed renewal and recovery on a disposable host.

A read-only audit is supplied at `apps/web/scripts/verify-manager-billing.mts`:

```sh
cd apps/web
node --env-file=.env.local --import tsx scripts/verify-manager-billing.mts
```

Set `STRIPE_EXPECTED_ACCOUNT_ID` to the intended account ID. The audit checks account,
prices, portal, schema and matching webhook URL/events, outputs only boolean checks,
and never creates a charge/customer/session. Even a successful configuration audit
reports `deliveryVerified=false` until actual webhook acceptance is completed.
Keep `STAYGUIDE_MANAGER_CHECKOUT_ENABLED=false` until launch acceptance passes.
Review tax registration and price tax treatment before enabling live billing;
automatic tax was not enabled by this work.

## Recovery

Disable `STAYGUIDE_PMS_DELIVERY_ENABLED` and pause connections before investigating.
Disable Vercel Cron explicitly on rollback: reverting a deployment does not remove
an existing cron schedule. Never reset unknown sends to approved without checking
the provider. Keep the prior deployment and database recovery point. The additive
scheduler table can remain when rolling code back; no customer tables need deletion.

References:
- https://vercel.com/docs/cron-jobs/quickstart
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/billing/subscriptions/acss-debit

## Deployment regression fixed

Vercel rejected deployment `dpl_3RbGmHWqRRcZ4An6xc3MuCgkredD` before building:
"Hobby accounts are limited to daily cron jobs." The unconditional five-minute
cron registration caused this failure. Replacing static `vercel.json` with
programmatic `vercel.mjs` preserves all build settings and defaults to no cron.
A production-only opt-in activates the schedule after suitable hosting is verified.
Tests exercise preview, development, default production and opted-in production
configuration. This fixes deployment eligibility without enabling guest delivery.

Access recheck: the connected Neon organisation still exposes no identified
StayGuide project. The existing isolated QA database URLs are sensitive variables
whose values cannot be read through this connector. The QA Stripe key is confirmed
empty. No credentials were copied from production or fabricated. These remain
account-configuration blockers; completing deployed payment/PMS verification
requires authorised access to the correct database, a matching Stripe test key and
the PMS vendor account.
