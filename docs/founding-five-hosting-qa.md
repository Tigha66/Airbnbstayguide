# Founding Five $49 USD guest-guide offer — QA readiness and draft terms

## Current USD change status — 25 November 2026

PR #40 remains an unmerged draft; production is unchanged and checkout remains disabled. This USD conversion is not yet ready for acceptance: Stripe authorization currently exposes only an unrelated Sandbox, so no new USD Price has been created and no QA Preview price variable has been changed. Do not enable checkout until the dedicated GetStayGuide Sandbox (`acct_1UfSytGLQPXVXXJZ`) is reauthorized and its test-mode identity is verified.

- The new offer is defined as a one-time $49 USD purchase. Monthly subscription prices remain unchanged.
- The legacy £49 GBP Price and historical payment/order/event evidence are retained as audit records; the new USD checkout must use a separate Price ID.
- Code changes in this PR are being prepared to validate the new USD Price, display the offer in English, French, Spanish, German, and Arabic, and provide localized confirmation details. The agreement remains a draft with supplier name and invoice-address placeholders; the owner has confirmed no UK VAT registration.
- No USD payment, signed USD webhook, Stripe-to-Neon reconciliation, or USD fulfilment has been completed. No production change or live-mode payment has occurred.

## Historical QA notes

