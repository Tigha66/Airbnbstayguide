# Founding Five $49 USD guest-guide offer — QA readiness and draft terms

## Current QA status — 26 November 2026

PR #40 remains an unmerged draft. Production is unchanged. The customer-facing agreement remains a draft and is not approved for sale or signature.

- Founding Five is a **$49 USD one-time** offer for one professionally prepared property guide, one consolidated revision, and 12 months of basic hosting from publication. There is no automatic renewal, and the account remains on Free.
- The connected Stripe account `acct_1UfSytGLQPXVXXJZ` is the dedicated **GetStayGuide QA** account. Stripe confirmed test mode (`livemode=false`).
- Active test Price `price_1UfpybGLQPXVXXJZWoSFpu3F` is $49 USD, one-time, and tagged QA-only. The isolated Preview's branch-scoped price and expected account variables point to this account and Price. The QA checkout flag is enabled only on the SSO-protected Preview branch.
- The read-only `/api/founding-five/account` check returned `verified=true`, the expected account ID, and `livemode=false`.
- Current code commit: `7823cc4f8af452cf0b2b3a39e78748496e5ae028`. Isolated Vercel Preview is READY: https://stayguide-isolated-pagby3rps-hajabdelhak66.vercel.app/
- Hosted GET checks returned HTTP 200 for the homepage, pricing page, guest demo, and English, French, Spanish, German and Arabic homepages. The offer appeared in all five languages; Arabic retained `lang="ar" dir="rtl"`.
- GitHub release-candidate CI run [#352](https://github.com/Tigha66/Airbnbstayguide/actions/runs/45810408559) passed tests, lint, typecheck, build and Chromium browser acceptance.

## Remaining end-to-end gates

No synthetic checkout/payment, signed webhook delivery, Stripe-to-Neon reconciliation, payment-linked fulfilment, or hosted failure/expiry/duplicate/refund cycle has been completed in this run. The 12-month entitlement lifecycle and Free-plan retention therefore remain unverified through a real hosted purchase flow.

The synthetic owner account needs the user-controlled password-reset step before authenticated QA can continue. Once the account is accessible, create and publish a customer-owned guide, then complete the isolated test-mode purchase and lifecycle checks.

The agreement still has supplier legal-name, invoice-address, support and privacy placeholders and requires qualified legal review. The owner reports no UK VAT registration; the draft does not state that VAT has been collected. No live-mode payment, production setting, production database, production deployment or merge was made.

## Historical QA notes

