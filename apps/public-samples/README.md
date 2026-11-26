# GetStayGuide public sample previews

A standalone Vercel project for short-lived property sample links. It serves only the ten sanitized public-source examples in `data/samples.json`; it has no database connection, authentication users, Stripe, Resend, or production app credentials.

Each link carries a 256-bit random bearer token in the URL fragment. The browser submits the token in a same-origin POST body. The server stores only SHA-256 token hashes in `SAMPLE_PREVIEW_KEYS_JSON`, validates expiry, and returns data for that one slug. The page uses no photos, no guest access details, noindex/no-referrer, and no-store responses.

## Vercel setup

- Project root: `apps/public-samples`
- Framework: Other
- Production branch: `feature/public-sample-access-20261126`
- Environment variable `SAMPLE_PREVIEW_KEYS_JSON`: production only; JSON mapping each slug to its SHA-256 token hash and ISO expiry.
- Do not enable Vercel SSO protection for the public production deployment. Keep previews disabled or protected.
- Rotate the environment variable and regenerate the ten links before the expiry date.
- Do not use this public project to host the main app or any authenticated customer data.

## Local test

Run `node --test` from this directory.
