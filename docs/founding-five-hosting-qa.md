# Founding Five £49 guest-guide offer — QA readiness and draft terms
*Internal proposal only. Not published, not legal advice, not a customer agreement, and not permission to charge or send.*

## Current technical evidence (repository `main`, inspected 23 November 2026)

- Published guest guides are selected by `getPublishedProperty(slug)` in `apps/web/lib/repo.ts` using `status = 'published'`, with **no subscription or trial expiry condition**.
- `/g/[slug]` loads this published guide; no payment is required simply to read a published guide.
- The Free plan allows **one property** and currently includes **25 concierge messages per month** (`packages/shared/src/index.ts`); the 14-day verified-account trial temporarily raises effective access to Pro. A paid £49 setup fee does **not** grant extra AI allowance, manager privileges, OpenWA, subscription or WhatsApp auto-sends.
- When the 14-day trial expires, `effectivePlanSql` reverts to `free` and existing guide records are not deleted. Tests on this branch exercise published access after over one year with no Stripe state and separate tenant access.
- **Important exceptions:** A host can unpublish or delete their guide; account deletion cascades to properties. A production database deletion, hosting outage, changed Free-plan rules or future policy change could also end access. There is currently **no £49 payment record, dedicated commissioned-guide entitlement, 12-month hosting-start date, renewal prompt or contractual hosting monitor**. Therefore these implementation details alone are insufficient to warrant advertising an unconditional 12-month guarantee.

## Proposed commercial terms — require owner and qualified legal review

**Scope.** £49 one-off for one commissioned mobile guest guide based on complete, accurate host-supplied content: property overview, arrival/departure details, Wi-Fi, parking, house rules, local recommendations, guest link and QR code, one consolidated revision, and setup walkthrough.

**Timeline.** Preview within five UK working days after cleared payment and receipt of complete approved information/assets; timeline pauses during missing information. Publication follows the host's review and approval. Revision request is one consolidated set of changes due within seven days after first preview; subsequent scope may incur a separately agreed fee.

**Hosting proposal.** Include 12 months of basic publication hosting **starting on the date the approved guide is first published**, while the customer's account and guide remain active and compliant. No automatic renewal or forced subscription. After 12 months, contact the customer with clearly priced continuation options and require positive acceptance before any charge. Existing self-service Free usage is a separate plan; do not promise an automatic loss of access at expiry while Free published guides remain supported. Do not promise 12 months publicly until the operator establishes a recorded entitlement and checks service reliability/backup/monitoring.

**Not included.** No real WhatsApp sending, automatic WhatsApp/AI replies, paid AI allowance, PMS integration, custom third-party integration, bespoke graphics, or accommodation performance guarantees. The service does not include the separately priced Starter/Pro subscriptions.

**Customer responsibilities.** Customer has rights to information, photos and branding supplied, reviews correctness and privacy/security before publication, and may correct or withdraw content; never request or publish sensitive access credentials without authorised handling and appropriate access restrictions.

**Supplier, tax and jurisdiction — outstanding.** Identify legal supplier name and address, business form, VAT registration status/number if applicable, business-customer jurisdiction, and any cross-border VAT/place-of-supply obligations. Do not publish `£49 including VAT` or `no VAT` without verification. UK HMRC's general threshold is currently £90,000 taxable turnover in a rolling 12-month period, but exceptions and overseas supplies vary: https://www.gov.uk/register-for-vat

**Cancellation/refund proposal — review separately for B2B and consumers.** Do not assert that the same 14-day withdrawal rights apply to business purchases. For eligible consumer distance contracts, disclose statutory rights before checkout and collect any necessary separate express request/consent and acknowledgement for early service performance or digital content, recording and confirming them on a durable medium. Do not treat a single general Terms checkbox as sufficient. Refund if provider cannot deliver or service has not started, with any deduction for properly authorised work subject to applicable law; statutory remedies remain. References:
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/37/2026-01-01
- https://www.legislation.gov.uk/uksi/2013/3134/part/3/made

**Business operations.** Record acceptance/version of customer agreement, property ID, scope, evidence of payment, guide-approved date, publication date, hosting-through date, revision deadline, and support contact. Confirm a backup and recovery process, customer support response expectations, terms for outages, and a transparent post-hosting continuation notice.

## Release checklist

- [ ] Owner identifies legal supplier and VAT position; qualified review of B2B and consumer wording
- [ ] Separate customer agreement approved and persisted with explicit acceptance/consents
- [ ] Dedicated commissioned-guide entitlement and hosting start/end recorded only after **verified** payment and approved guide publication (or documented manual fulfilment with equivalent audited records)
- [ ] Controlled-date tests on entitlement, owner isolation, trial expiry, no auto-billing, and no unintended AI/WhatsApp privileges
- [ ] Demonstrate one real published-guide link after trial under expected customer plan
- [ ] Verify backups, restoration and expiry/renewal communications
- [ ] Verify exact Stripe account and one-time payment flow if payment is collected online
- [ ] No public price/checkout change or sales send without separate approval

## Current GO / NO-GO

**Technical Free guide retention**: supported by current code, conditional on an active account and published property; regression tests have been added. **Commercial 12-month service promise**: NO-GO until payment-linked entitlement/record, legal terms, operational controls and approval are complete.
