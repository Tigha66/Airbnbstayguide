# StayGuide status

_Kept up to date with the code. If something here disagrees with the code, the code wins: fix this file._

## Working (with production credentials)

- Marketing site in 5 languages; guest guide PWA (installable, works offline); Google sign-in; Neon Postgres.
- Host dashboard: properties from a pasted house manual (AI-organised or parsed), editing, publishing, share kit/QR,
  inbox with host replies, extras, analytics, billing.
- AI concierge: answers only from the guide, in the guest's language, cites sections, escalates unknown questions.
- AI guide translation for guests, cached per guide version.
- Stripe: per-property subscriptions (Checkout, Customer Portal, webhook, quantity sync), Stripe Connect payouts for
  paid extras.
- Cost/abuse limits on AI and public endpoints (see README).

## Not built / planned

- iOS host app (planned; no code in the repo).
- Per-stay access codes for door codes (keep codes out of the guide and send them in the booking message for now).
- Integrations with Airbnb, Booking.com or property-management systems.

## Owner actions

- Copy `docs/ci.workflow.yml` to `.github/workflows/ci.yml` from the GitHub website (the coding agent can't push
  workflow files).
- Give Vercel Preview its own database (`PREVIEW_DATABASE_URL`); see README.

## Payments

- Stripe is in **live mode**. Products, prices, Customer Portal and webhook are provisioned by
  `pnpm --filter @stayguide/web stripe:setup` (env `STRIPE_SECRET_KEY`, `APP_URL`); it prints `STRIPE_WEBHOOK_SECRET`.
- Prices are found by **lookup key** (`stayguide_<plan>_<monthly|yearly>_usd`), not by price-id environment variables.
  Plans: Free (1 property) / Starter $9 / Pro $19 per property per month; yearly = 10× monthly.
- Extras: once a host finishes Stripe Connect (Express) onboarding, guests pay in Checkout; StayGuide keeps 5%
  (`application_fee_amount`). Extras needing approval are authorised and captured on approval; decline releases the
  hold; paid extras can be refunded (transfer and fee reversed).
- **Owner action:** Connect must be activated at https://dashboard.stripe.com/connect. Until then hosts see "coming
  soon" and extras fall back to manual requests.

## Deploying

Vercel (Hobby) blocks CLI deploys whose git commit author is not a member of the Vercel team. Deploy from a
git-free copy:

```bash
git archive HEAD | tar -x -C /tmp/deploy
# add .vercel/project.json (projectId + orgId), then:
npx vercel deploy --prod --yes --token $VERCEL_TOKEN   # run inside /tmp/deploy
```
