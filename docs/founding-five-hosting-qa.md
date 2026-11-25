# Founding Five £49 guest-guide offer — QA readiness and draft terms

## Current status — 25 November 2026

This section supersedes conflicting statements in the historical 24 November snapshot below. PR #40 remains a draft and unmerged; production is unchanged.

- **Code and CI:** Current head `d30564d` adds terminal asynchronous payment-failure handling and a PostgreSQL-backed regression test. GitHub release-candidate run [#45646326837](https://github.com/Tigha66/Airbnbstayguide/actions/runs/45646326837) is in progress. Prior CI passed through code head `28b319c`. Vercel Preview for the previous docs head `05280d9` was READY and its synthetic public guide returned HTTP 200; recheck the new code head after deployment.
- **QA property and guide:** The synthetic property is published, its owner matches the owner on the hosting record, and its public Preview guide returned HTTP 200. Vercel logged one application-initialization timeout on an earlier request; a subsequent request returned HTTP 200. Recheck after the next Preview deployment.
- **Neon lifecycle state:** Neon currently has one fulfilled order and one active hosting grant. The grant is linked to the matching owner and published property, with start `2026-11-24T11:42:59Z` and end `2027-11-24T11:42:59Z`. The three accounts remain on Free and none has a Stripe subscription. Lifecycle test coverage exists in CI.
- **Payment evidence is not valid for the specified account:** The QA database contains a completed-order record and a processed `checkout.session.completed` event, but their Checkout Session/event references could not be retrieved from the connected Stripe test account `acct_1Rdzf0G3wnn7CPRM`. Do not count those database records as verified payment evidence or as a payment in that account.
- **Correct test price:** The connected account has active test-mode price `price_1Uf2xBG3wnn7CPRMl3nuMIYM`, GBP 4,900 pence, one-time, `livemode=false`. Branch-scoped Preview variable `STRIPE_FOUNDING_FIVE_QA_PRICE_ID` is set to this ID and is included in the READY Preview for `05280d9` and subsequent builds.
- **Secret and checkout state:** Branch-scoped sensitive variables `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` remain configured but their values were not read. The user has not yet confirmed updating `STRIPE_SECRET_KEY` to the correct connected test account. `FOUNDING_FIVE_QA_ENABLED=false` remains in the branch Preview environment; no fresh Checkout Session or payment should be attempted until the key is confirmed and a fresh build is deployed.
- **Webhook state:** The dedicated test-mode Stripe destinations `we_1UfCldG3wnn7CPRMsPVhsdbe` and `we_1Uf4ewG3wnn7CPRM4qQWv4NF` are disabled. The Stripe API response showed no configured URL/signing secret for them. Signed delivery, invalid-signature rejection and endpoint idempotency are therefore still unverified. Do not route Founding Five events to unrelated legacy endpoints.
- **Older Preview risk:** Vercel reports SSO protection enabled for production deployment URLs and all Preview deployments. An older READY Preview created with the checkout flag enabled remains in the project. This protection contains public access, but the available Vercel connector has no deployment-delete action; explicit cleanup of that old deployment remains outstanding. The current branch Preview flag is false.
- **Tax:** The owner confirms they are not currently UK VAT-registered. No production tax or payment setting was changed.

### Remaining technical release gates

1. After the owner updates the branch-scoped Preview Stripe key, verify its account identity and keep all operations in test mode.
2. Confirm the fresh isolated Preview built after the corrected key is saved; keep the checkout flag off until account, URL, signature secret, Vercel protection and Neon isolation all agree.
3. Configure a dedicated test-mode webhook for that Preview and verify a real signed delivery.
4. Run a fresh £49 GBP Checkout Session/payment in the specified account and match the session, payment and event IDs to Neon QA.
5. Verify success, failure, expiry, duplicate events, refunds and duplicate fulfilment; confirm the account remains Free with no subscription and the hosting grant remains exactly 12 months from publication.
6. Recheck the old checkout-enabled Preview. SSO currently restricts all Preview deployments; remove or otherwise disable the old deployment when the Vercel UI provides a safe control.
7. Complete release acceptance and obtain separate approval before any merge, production change or public sale.

### Historical GO / NO-GO (24 November 2026)

**NO-GO for paid customers.** QA proves the published guide, owner linkage, 12-month hosting record and Free-plan state. The payment record is not corroborated in the specified Stripe account, the dedicated webhook is disabled, the corrected Preview price variable has not yet been deployed, and the prior startup timeout needs a clean retest. The separate agreement draft is not approved for sale or signature. Keep PR #40 unmerged and production unchanged.

---


*Internal proposal only. Not published, not legal advice, not a customer agreement, and not permission to charge or send.*

## Historical technical evidence (checked 24 November 2026; superseded by current status above)

- Published guest guides are selected by `getPublishedProperty(slug)` in `apps/web/lib/repo.ts` using `status = 'published'`, without a subscription or trial-expiry condition. `/g/[slug]` is public.
- A synthetic QA account was registered and verified through PR #40's Resend configuration, logged out and back in, and retained an authenticated session. The Neon QA record is on isolated project `shy-voice-70913438`, branch `br-crimson-band-zascnds1`, database `stayguide_qa`; it remains Free with no Stripe customer or subscription.
- A synthetic owner property (ID `891bdf35-995b-436c-a11b-d1cf7db7972a`, slug `qa-test-cottage-qi49`) is published with a database publication timestamp. Its public guide returned HTTP 200 from the latest Preview.
- `RESEND_API_KEY` is configured as a Sensitive Preview variable restricted to the PR #40 branch; the synthetic verification email was delivered. No customer or prospect email was sent.
- Stripe account `acct_1Rdzf0G3wnn7CPRM` was verified in test mode. Existing QA-only one-time price `price_1Uf2xBG3wnn7CPRMl3nuMIYM` is active at GBP 4,900 pence, with `livemode=false`. No product or price was created in this continuation.
- Dedicated QA webhook `we_1UfCldG3wnn7CPRMsPVhsdbe` is test-mode only and currently **disabled**. Its configured URL still points to an earlier isolated PR #40 Preview, not the newest deployment. One earlier `checkout.session.expired` event was recorded, but delivery/signature validation against the latest deployment, invalid-signature rejection and duplicate-event handling have not been demonstrated.
- Latest Preview deployment is READY for PR #40 commit `2d521b273698f91d9f3fc47f765a57822425127b` at [stayguide-isolated-adz08xbjr-hajabdelhak66.vercel.app](https://stayguide-isolated-adz08xbjr-hajabdelhak66.vercel.app). The branch-specific `FOUNDING_FIVE_QA_ENABLED` value is `false`. A prior READY Preview created while the flag was true remains; project-wide Preview protection is enabled, and the available Vercel connector has no deployment-delete action.
- The latest CI run #327 passed tests, lint, typecheck, build and browser acceptance. The new regression test confirms that a paid Founding Five order keeps the effective plan Free and suppresses the Pro AI trial. No £49 Checkout Session or payment has been created; there is no order or hosting grant for the synthetic customer.
- A Neon QA branch clone was verified earlier. A proper non-empty snapshot restore and post-restore application test are not verified.

## Proposed commercial terms — require owner and qualified legal review

**Scope.** £49 one-off for one commissioned mobile guest guide based on complete, accurate host-supplied content: property overview, arrival/departure details, Wi-Fi, parking, house rules, local recommendations, guest link and QR code, one consolidated revision, and setup walkthrough.

**Timeline.** Preview within five UK working days after cleared payment and receipt of complete approved information/assets; timeline pauses during missing information. Publication follows the host's review and approval. Revision request is one consolidated set of changes due within seven days after first preview; subsequent scope may incur a separately agreed fee.

**Hosting proposal.** Include 12 months of basic publication hosting **starting on the date the approved guide is first published**, while the customer's account and guide remain active and compliant. No automatic renewal or forced subscription. After 12 months, contact the customer with clearly priced continuation options and require positive acceptance before any charge. Existing self-service Free usage is a separate plan; do not promise an automatic loss of access at expiry while Free published guides remain supported. Do not promise 12 months publicly until the operator establishes a recorded entitlement and checks service reliability/backup/monitoring.

**Not included.** No real WhatsApp sending, automatic WhatsApp/AI replies, paid AI allowance, PMS integration, custom third-party integration, bespoke graphics, or accommodation performance guarantees. The service does not include the separately priced Starter/Pro subscriptions.

**Customer responsibilities.** Customer has rights to information, photos and branding supplied, reviews correctness and privacy/security before publication, and may correct or withdraw content; never request or publish sensitive access credentials without authorised handling and appropriate access restrictions.

**Supplier, tax and jurisdiction — partially confirmed by product owner (23 November 2026).** Owner reports currently operating **without UK VAT registration**. For the proposed UK offer, the provisional customer charge is **£49 total, with no VAT charged or VAT shown on invoices while the supplier remains unregistered**, subject to confirmation that registration is not already legally required. Never label this amount `£49 including VAT`, never present a VAT amount, and do not describe the business as VAT-registered. Keep Stripe Tax automatic collection disabled for this specifically unregistered UK seller *unless and until* a tax professional confirms a registration/collection obligation. Legal supplier name, service/trading address, business form, business-versus-consumer customer scope, and international place-of-supply/VAT/GST treatment remain unconfirmed. HMRC's standard UK-established threshold is £90,000 taxable turnover over a rolling 12-month period; expected turnover in the next 30 days and non-established seller rules can also trigger registration. Monitor obligations and revisit configuration when required: https://www.gov.uk/register-for-vat . This note **does not** authorize product publication, a live checkout, a charge or Stripe Tax changes.

**Draft invoice wording — internal only, not approved for issue.** Supplier: `[legal supplier name]`, `[trading name if different]`, `[service/trading address]`, `[contact email]`. Customer: `[customer name and billing address]`. Description: `One-off commissioned guest guide and 12 months of basic hosting from the approved guide’s first publication date`. Amount due: `£49.00 GBP`. VAT: `Not charged — supplier reports that it is not VAT-registered; confirm the registration position before sale.` Do not show a VAT amount or VAT registration number, and do not call the price VAT-inclusive. Add invoice number, date, payment reference, property ID, agreement version, publication date, and hosting end date after fulfilment. Fill in supplier details only after the owner confirms them.

**Draft consumer terms — subject to qualified review.** Before checkout, show the full scope, total price, payment method, delivery timetable, supplier name/address/contact, complaint contact, cancellation instructions, standard cancellation form, and any conditions that can end hosting. A consumer distance contract for a service or non-tangible digital content normally has a 14-day cancellation period from contract formation. Do not start commissioned work during that period unless the consumer makes a separate, clear express request. If they cancel after authorised service work has begun, only a legally permitted amount proportionate to the work supplied may be due, and only if the required information and request were obtained. The cancellation right for the service ends after full performance only where the required request and acknowledgement were obtained. Any early digital-content supply needs a separate express consent and acknowledgement before access begins, with confirmation on a durable medium. Keep guide-publication approval separate from these cancellation consents. Do not use a blanket “no refunds” term; refund rules, remedies for defective or undelivered work, and the treatment of this combined setup-and-hosting service need legal review.

**Draft business terms — subject to qualified review.** Use this route only where the buyer confirms they are purchasing for business purposes; do not classify an individual or sole trader as a business solely because they own a property. State the one-off £49 scope, customer-supplied information obligations, preview/revision limits, publication approval, 12-month start and end dates, outage/support limits, cancellation process, and refund remedies for non-delivery or breach. No subscription or automatic renewal is included. Any continuation after month 12 requires a new, explicit order and price. Do not use business wording to restrict rights that cannot lawfully be excluded.

**Supplier/tax information still needed.** Confirm the supplier’s legal name, business form (for example, sole trader or incorporated company), service/trading address, contact email, and whether a trading name differs. If incorporated, confirm the legal company details that must appear on customer documents. The owner reports no current UK VAT registration; no VAT number should be invented or shown. Confirm that no registration obligation has arisen and obtain advice before selling outside the UK because place-of-supply and overseas VAT/GST rules may differ. HMRC says a UK-established business must register if taxable turnover exceeds £90,000 over the previous 12 months or is expected to exceed £90,000 in the next 30 days; other rules can apply. Sources: https://www.gov.uk/register-for-vat and https://www.gov.uk/online-and-distance-selling-for-businesses .

**Legal references for review:** https://www.legislation.gov.uk/uksi/2013/3134/part/3/made ; service started early, regulation 36: https://www.legislation.gov.uk/uksi/2013/3134/regulation/36/2026-01-01 ; digital content, regulation 37: https://www.legislation.gov.uk/uksi/2013/3134/regulation/37/2026-01-01 .

**Business operations.** Record acceptance/version of customer agreement, property ID, scope, evidence of payment, guide-approved date, publication date, hosting-through date, revision deadline, and support contact. Confirm a backup and recovery process, customer support response expectations, terms for outages, and a transparent post-hosting continuation notice.

## Release checklist

- [x] Owner confirms they are currently operating without UK VAT registration (23 Nov 2026); registration obligation still needs validation
- [ ] Owner identifies legal supplier identity/address and confirms VAT registration is not already required; qualified review of B2B/consumer wording
- [ ] Separate customer agreement approved and persisted with explicit acceptance/consents
- [ ] Deploy the draft code to an isolated Preview and exercise the owner-triggered fulfilment flow end to end after a verified QA payment; only later review a production migration and issue records after **verified** payment and approved guide publication, with audited agreement acceptance and no paid-feature grant
- [ ] Controlled-date tests on entitlement, owner isolation, trial expiry, no auto-billing, and no unintended AI/WhatsApp privileges
- [ ] Demonstrate one real published-guide link after trial under expected customer plan
- [ ] Verify backups, restoration and expiry/renewal communications
- [ ] Verify exact Stripe account and one-time payment flow if payment is collected online
- [ ] No public price/checkout change or sales send without separate approval

## Current GO / NO-GO

**Technical Free guide retention**: supported by current code, conditional on an active account and published property; regression tests have been added. **Commercial 12-month service promise**: NO-GO until the implemented QA flow has passed a real test-mode checkout/fulfilment cycle, consumer and business terms are approved, supplier/tax position is confirmed, operational controls are verified, and production release is separately approved.
