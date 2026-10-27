# GuestPulse AI / StayGuide Manager — commercial launch gates

Checked 27 October 2026. **HOLD production release** until all five gates below have independent evidence. This branch extends the existing GetStayGuide production code, not a second product.

## Delivered in this release candidate (non-sending)

- Shared Manager features already in `main`: guide chat portfolio inbox, rules, triage, saved replies, flat $199 monthly / $1,990 yearly pricing copy.
- `lib/guest-automations.ts`: deterministic **human-review drafts** based on a *verified* reservation supplied by an authorised adapter, with tenant-specific event keys and property-local quiet hours. This module **cannot send** or connect to PMS accounts.
- `lib/pms-webhooks.ts` plus `POST /api/v1/pms/guesty/webhook`: accepts only signed and recent Guesty `reservation.messageReceived` / `reservation.messageSent` envelopes, with 128 KiB cap, raw-body signature validation, minimal metadata and idempotent database insertion. Returns **503 if signing or database configuration is missing**, and intentionally does not update a guest-visible inbox or send messages.
- `pms_webhook_events` stores provider event identifiers and SHA256 digest only. **No guest PII, raw message content, or provider-supplied owner identity are trusted**.
- Unit tests cover signature tampering, stale/replayed envelopes, no automatic sending, duplicate DB events and daylight saving time.
- Manager checkout is **fail-closed**: `STAYGUIDE_MANAGER_CHECKOUT_ENABLED=true` must be set deliberately **and** the actual database must contain all three Manager tables. No Stripe customer or Checkout Session is created when this gate is closed. Do not set the flag before completing launch acceptance.
- No production migration, provider OAuth, signed messaging send flow or live billing has been performed by this branch.

## 1. Production database recovery / migration — BLOCKED

Connected Neon organisation currently lists ten projects, none matching StayGuide's `users`, `properties`, `chat_messages` schema. The Vercel production `DATABASE_URL` exists but its owning Neon project is not accessible via the Neon plugin in this account.

Do **not** run the schema against an unrelated database. Connect the right Neon organisation/project, verify application endpoint/branch and user/data counts, create an immutable recovery snapshot and test an isolated restore. Then run the reviewed additive SQL; verify legacy records and Manager tables. Implement standard retention/access policy for staged webhook events before enabling a real feed.

## 2. Stripe subscriptions — PARTIAL

In the connected **test** Stripe account `acct_1QlVyOC6A1Vf4vwF`, previously used for StayGuide Starter/Pro QA, Manager recurring test prices now exist:
- Monthly: `stayguide_manager_monthly_usd`, $199 (`price_1UVHjUC6A1Vf4vwFnMF884IP`).
- Yearly: `stayguide_manager_yearly_usd`, $1,990 (`price_1UVHjWC6A1Vf4vwFybJaOoTP`).

These are **not live-mode** products. Validate sandbox hosted Checkout, signed webhooks, customer portal, cancellation, failed renewal, renewal quantities fixed at one, 50-property cap, full entitlement tests and currency. Connect/verify the correct live billing Stripe account before commercial checkout. Never activate unrestricted Stripe portal plan switching to Manager.

## 3. PMS messaging — NOT CONNECTED

**Guesty:** An admin with Open API permissions must create OAuth app credentials and configure the *per-subscription* signing secret for the webhook URL. Its API token cache must respect the documented token limits. This branch only stages signed communication event metadata. Build actual account-bound OAuth/token encryption, initial property/reservation import, verified owner/property mapping, message fetch/reconciliation and read-only inbox sync before enabling any Guesty connection for customers.

**Hospitable:** A SaaS vendor needs approved Partner Portal OAuth credentials (personal access tokens are for a host's own use). Message-writing privileges are not assumed. Apply for vendor access, configure redirect URLs and approved scopes, then implement read-only sync and reconciliation. Do not call the product connected before successful real-account testing.

**Outbound automated messaging:** Requires explicit per-account opt-in, per-reservation consent/channel rules, manager-reviewed templates, accurate time-zone scheduling, current reservation status and property ownership re-check, durable sends with bounded retries, error visibility, prevention of duplicate Hospitable/Guesty automatic messages, optional AI confidence threshold, quiet hours and emergency handover. Upsell confirmation additionally requires availability and customer-accepted payment. Do not trigger live delivery without end-to-end verification.

References:
- https://open-api-docs.guesty.com/docs/quick-start-guide
- https://open-api-docs.guesty.com/docs/webhooks
- https://open-api-docs.guesty.com/docs/webhooks-messages
- https://help.hospitable.com/en/articles/16234141-how-can-vendors-manage-oauth-credentials-redirect-urls-and-webhooks-for-hospitable-integrations
- https://docs.svix.com/receiving/verifying-payloads/how

## 4. Real two-account Manager acceptance — NOT VERIFIED

Verify a real Manager login and a separate unentitled host on the actual **staging database**:
- signup/login/logout/reset-email, billing and Manager entitlement;
- rules create/update/disable/delete, inbox reply, thread deep link, classification, mobile and 50-property boundaries;
- tenant A must not view/edit any of tenant B's properties, threads, rules, reservation imports or outgoing drafts;
- signed webhook duplicate / missing / stale / unexpected provider and failures;
- checkout + renewal + cancellation + failed-renewal end-to-end in sandbox;
- database migration and email transport on a staging account.

These checks may not be substituted with a Vercel `READY` build or an HTML page showing demo data.

## 5. Production release — ON HOLD

Verify target team/project: Vercel `hajabdelhak66/stayguide`, GitHub `Tigha66/Airbnbstayguide`, main is the live branch. Require all tests, protected database recovery and signed billing/webhook checks; stage a production build *without domain assignment* and smoke test the actual production settings first. Promote the reviewed production build only after all four prior gates pass and retain a rollback deployment. Monitor logs and provider event queues.

**Do not announce GuestPulse AI as commercially ready yet.** The integrated StayGuide Manager **demo** and marketing page are publicly accessible, but paid real PMS communications are not proven operational.

## Delivery queue implementation — 27 October follow-up

The `agent/guestpulse-operational-20261027` branch adds `lib/pms-outbox.ts`,
`/api/v1/manager/outbox` and the Manager delivery status panel. This is an
**integration foundation, not a connected or commercially operational service**.

Implemented:
- Durable immutable drafts with owner-scoped idempotency keys and exact-content
  approval hashes; tenant-owned properties and verified provider links required.
- Server authentication, verified email, Manager entitlements, same-origin writes,
  strict payload validation, draft rate limits, private/no-store responses.
- Atomic `SKIP LOCKED` claims; current entitlement/property/connection rechecks;
  pause/cancel, quiet hours, backoff and a three-attempt ceiling.
- Ambiguous sends and crashed leases are quarantined as `unknown`, never retried
  automatically. Provider receipts and delivery state audit entries are persisted.
- The adapter must verify current provider account, listing, reservation,
  conversation, consent and manual takeover before every send. No webhook or
  client identity is accepted as that verification.

**Still absent:** registered live provider adapters, credential encryption/token
refresh/OAuth onboarding, property and reservation sync/reconciliation, scheduler
invocation and real-provider delivery acceptance. `deliverPmsBatch` is tested
with fixture adapters only. There is no production cron, provider credential API,
or way to turn on live sending in the UI. `deliveryAvailable` is deliberately
false. Do not change it merely because an environment flag exists.

Before wiring a live worker:
1. Implement and verify provider-approved OAuth, secure credential lifecycle,
   account ownership and property links; start with read-only sync.
2. Implement `PmsDeliveryAdapter.verify` against current provider data and channel
   rules, not fixture flags. `send` must return a durable provider message ID;
   timeouts and uncertain errors must remain `unknown`. Only provably pre-delivery
   rejections may raise `PmsSendError('retryable')`.
3. Register only verified server adapters and add an authenticated scheduler with
   bounded batch calls. Require per-connection `delivery_enabled`, unpaused state
   and `STAYGUIDE_PMS_DELIVERY_ENABLED=true`; all are off by default.
4. Complete controlled test-account delivery, reply/opt-out/manual takeover,
   cancellation and duplicate/recovery tests before authorising real guest sends.

Schema rollout: review the new `pms_connections`, `pms_property_links`,
`pms_outbox` and `pms_delivery_audit` tables after a verified backup/restore.
No production schema has been applied in this follow-up. Existing guest records
are not changed. Keep the prior deployment available; roll back code and switch
the delivery flag off before investigating failures. Do not delete uncertain
outbox records or force them back to approved; reconcile in the provider first.
Establish customer retention/export/deletion rules for outbox bodies and restrict
SQL access before storing real guest communication.

Follow-up verification: the full suite passed 171 tests before the final
concurrency case; the final outbox suite passed 11 cases (including concurrent
workers), and four API boundary cases passed. Lint, strict TypeScript and the
production build passed. The new mobile browser acceptance case is supplied,
but could not run here: Chromium download returned a truncated/invalid archive.
These are fixture/PGlite checks, not proof of live Guesty/Hospitable delivery.
