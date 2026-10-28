# StayGuide account launch acceptance — 28 October 2026

## Implemented and checked

- Email verification GET requests only render a confirmation form. Explicit POST
  confirmation consumes the single-use token; scanners cannot verify an account
  merely by opening the email link. The account lifecycle test exercises the page
  and confirms that the account remains unverified until token redemption.
- Password-reset requests retain a generic response for unknown accounts and no
  longer claim a message was sent when email configuration is unavailable.
- Email provider errors retain only HTTP status and a known machine-readable code,
  never provider response bodies containing recipients, credentials or links.
- The onboarding preview link selects a published property. Subscription selection
  and optional guest-extra payouts are explained separately.
- Billing reports server-side checkout configuration, email verification and
  Manager rollout/schema readiness. The UI disables unavailable purchases and
  displays the reason; checkout endpoints retain their independent authorization.
- Starter/Pro displayed quantities use per-property billing even for a previously
  flat-rate Manager account. Expired incomplete subscriptions no longer appear active.
- Operator Stripe setup checks the expected account, includes reviewed Manager
  monthly/yearly prices, refuses mismatched prices, and creates a cancellation-only
  portal without altering an existing environment's portal. New signing secrets
  are written to an exclusive mode-0600 file outside this repository, never stdout.

Validation: all 200 tests in 36 files passed, ESLint passed, TypeScript passed and
the Next.js production build passed. These are source/isolated-fixture checks;
they do not certify hosted payments or delivered email.

## Email setup pending DNS authorization

Resend's `tigha66` account initially listed only `callpilotvoice.co.uk` as verified.
The StayGuide domain was prepared separately; no CallPilot sender/key or domain
was changed. `getstayguide.com` DNS is external to Vercel, on Cloudflare nameservers
`kimora.ns.cloudflare.com` and `devin.ns.cloudflare.com`. Cloudflare sign-in is
required before inspecting conflicts or adding records.

Resend pending-domain ID: `15ad2b33-b46c-4264-80d3-683451e9a0bf` (Ireland).
Record values below are public DNS material, not credentials. Re-read Resend's
current records before applying, and preserve existing root MX/SPF/DMARC records.

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDHDmF/KDf1GIlnqFzLn4XGAhWc0/szbhXYSAk9Uo5cB5LdjxBC2t8C1O7IzYvoWyK0Wec2TL6Mcr7ItM1AcH+M6NXL5kREciz3p/27qm1vn9s76r2SQefxJljbCbCmcgpOpKZN4sivF0J82G7n5wACYmBNvxZeet8b9noagcVq4wIDAQAB` | N/A |
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net` | DNS only |
| CNAME | `send` | `send.forge.rmta.net` | DNS only |

After verified DNS, provision a sending-only key for the StayGuide domain, store
it as `RESEND_API_KEY` in the authorized environment and configure the actual sender
as `StayGuide <hello@getstayguide.com>`. Remove/override any higher-priority stale
`EMAIL_FROM` value only after reviewing the current configuration. Do not reuse
another application's identity or claim delivery from a Resend API acceptance alone.

Acceptance still required: fresh signup, delivered verification email, explicit
verification, password-reset delivery, password change, old-session revocation,
re-login and persisted property/guide after reload. Never verify a fixture by a
manual database backfill as a substitute for delivered ownership proof.

## Billing external acceptance pending

The correct QA test catalogue is configured in account `acct_1Rdzf0G3wnn7CPRM`.
The QA signing secret is not configured and incoming Stripe requests are blocked
by Vercel Authentication. Do not expose the whole preview or route QA events into
production. A reviewed temporary, deployment-scoped webhook access arrangement is
needed before registering the sandbox endpoint and verifying actual delivery.

Then test hosted checkout from a fresh verified QA account, signed activation,
duplicate handling, payment failure/recovery, cancellation and cancellation portal.
No real-money charge is authorized. No production sales/delivery flags were enabled.

Production release remains pending external acceptance. PMS partner onboarding is
a separate dependency and Manager automation must not be advertised as connected.
