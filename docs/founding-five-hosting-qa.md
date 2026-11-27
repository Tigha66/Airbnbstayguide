# Founding Five $49 USD guest-guide — QA status and draft terms

## Verified hosted purchase — 26 November 2026

PR #40 remains an unmerged draft. Production and live payments are unchanged. This record describes a synthetic Stripe test-mode payment only; it is not customer revenue and is excluded from taxable turnover.

- Stripe account: `acct_1UfSytGLQPXVXXJZ`, verified `livemode=false`.
- Test payment: **$49.00 USD**, one-time Checkout Session, paid; PaymentIntent succeeded; tax $0; no subscription.
- Neon records the matching commissioned order as fulfilled and the signed `checkout.session.completed` webhook as processed exactly once. The order's owner matches the property owner.
- Hosting is active for the selected published guide from **26 November 2026 through 26 November 2027**. No automatic renewal; the account's plan remains Free.
- The owner dashboard shows the active hosting status and end date, hides the purchase control for that property, and provides a Stripe receipt link.
- The confirmation email was delivered to the synthetic QA alias. Gmail authentication results showed SPF and DKIM pass; the email includes “Supplier is not VAT registered. No UK VAT charged.”
- This successful session predates the later invoice-generation change. It has no Stripe invoice; do not treat it as invoice-delivery evidence.
- Automated tests cover duplicate webhook processing, async payment failure, expiry and refund transitions. Those cases have not yet been run as separate hosted Stripe transactions.
- The test Price is `price_1UfpybGLQPXVXXJZWoSFpu3F`, one-time $49 USD and QA-tagged. Checkout is gated to the isolated Preview and the expected test account.

## Current implementation and verification limits

- Latest implementation commit before this documentation refresh: `c654bb0e9f958e6519364cf26b55eb2f2a383914`. CI run [#384](https://github.com/Tigha66/Airbnbstayguide/actions/runs/45891958454) passed unit tests, lint, typecheck, build and Chromium browser acceptance. The isolated QA and standard Preview checks passed; the separate prospect-samples deployment failed because its Vercel root directory `apps/public-samples` does not exist.
- The current commit status shows the isolated Preview and production project's check successful; the prospect-samples project check failed because its configured root directory `apps/public-samples` does not exist. The prospect page links therefore are not externally usable or incognito-verified.
- Commit `5a56f81` had 186/186 unit tests passing and lint passing, but failed TypeScript on receipt-link narrowing. Commit `9ac5d06` fixes that TypeScript error; a complete green CI result for that exact head has not yet been observed.
- The sample-request route now persists requests, attempts idempotent customer acknowledgements and internal support notifications, and records each delivery status for the founder-only dashboard. Hosted form submission, Neon persistence and Resend delivery remain unverified; the earlier browser test used a mocked POST.
- The Stripe Checkout code now requests a customer and enables one-time invoice creation, adds a service description, VAT-status footer and QA metadata, and exposes owner-scoped receipt/invoice links. Actual generation, email delivery and customer access for an invoice remain unverified until a fresh eligible test checkout can be completed.

## Offer terms currently represented in the draft

The offer is **$49 USD once** for one professionally prepared property guide, one consolidated revision, and 12 months of basic hosting from publication. There is no automatic renewal or paid monthly subscription; the account remains on Free. The monthly subscription prices remain unchanged.

## Remaining launch gates

- Run hosted negative-payment, expired-session, refund and duplicate-webhook scenarios without altering the already-paid order or its active hosting.
- Verify the new invoice path with an eligible fresh test checkout, including customer delivery/access and refund documentation. Stripe post-payment invoice generation may incur a Stripe fee; review the current fee before enabling it in live mode.
- Fix the separate sample-preview Vercel project root and protection design, then verify all ten tokenized guides in incognito and mobile. Until then, do not send related outreach drafts.
- Complete a real hosted sample request, verify Neon persistence, acknowledgement and internal notification.
- Verify latest-head full CI, migrations/backups, production secret/database isolation, and security/authentication acceptance.
- Complete supplier identity/contact fields and obtain professional review of the customer agreement, privacy, refund and tax terms before presenting them for acceptance.
- Overseas B2C tax treatment remains to be assessed before affected international sales. No tax registration has been initiated.

The owner reports no UK VAT registration and does not wish to register voluntarily unless legally mandatory. Do not display a VAT number or describe the supply as VAT-exempt. The invoice wording is “Supplier is not VAT registered. No UK VAT charged.”

## Release position

**NO-GO for accepting a genuine payment today.** The verified QA purchase proves the core paid webhook-to-Neon fulfilment path, but invoice delivery, negative hosted payment cases, prospect access, sample-request email/persistence, and production acceptance remain incomplete. Do not merge PR #40, change production, or activate live payments without separate approval.
