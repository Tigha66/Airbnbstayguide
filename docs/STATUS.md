# Release status

## Update: free-tier backend (Neon + Google + Hugging Face)

Implemented and tested (PGlite integration tests + browser tests): Google sign-in, Neon-backed property/guide CRUD with owner isolation and plan limits, autosave, public guides on any device, view analytics, concierge with AI (Hugging Face) or keyword fallback, citations, escalation to a live inbox with host replies shown to guests, extra requests with approve/decline, account deletion, Postgres rate limiting. Activates when `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (and optionally `HF_TOKEN`) are set; not yet verified against a live Neon database or real Google OAuth.

Still open: Stripe billing and payouts for extras (requests only for now), email/push notifications, per-stay access codes for door codes, AI translation of the guide body (the concierge already answers in the guest's language), team members, the iOS app's migration from Supabase auth to the new API, custom domains. The section below describes the earlier Supabase plan and is partly superseded.

## Ready to review as a demo

- Responsive marketing, pricing calculator, ROI calculator, FAQ, three articles, draft legal notices.
- Browser-persisted host property creation, section editor, markdown preview, reorder, sample inbox, extras catalog, QR kit, analytics preview, dark mode.
- Guest guide, sample Wi-Fi, maps, guide-based concierge lookup and source citations, extras preview, install manifest and Serwist offline caching.
- Expo native host UI, guide editing/cache, native share, camera, haptics, optional session biometric lock, Apple auth and API client adapters.
- Shared schemas, plan calculations, API and migration groundwork, CI, unit/browser testing.

## Must finish before accepting customers

These are code/integration tasks, not simply environment-variable switches:

- Connect host and guest UIs to authenticated multi-tenant CRUD; complete real onboarding and role-aware team management. The current dashboard always uses demo storage.
- Harden and test RLS, immutable tenant/parent identifiers, cleaner access, sensitive section access, ownership transfer/deletion, plan transitions, and tenant isolation in a real database. Migration is an unapplied draft.
- Add public published-guide projection, per-stay access-code verification, and private credential reveal; never place real entry codes in public/offline caches.
- Add pgvector indexing/retrieval, provider timeouts and robust grounded output validation, real thread continuity, translation/cache invalidation, PDF import, nearby places workflow.
- Complete Stripe Connect onboarding and readiness, extras approval/Checkout/payment/refund state machine, idempotent order webhooks, Customer Portal, property-count synchronization, invoice and trial notifications.
- Realtime inbox subscription, verified push registration/delivery, email adapters, retries/outbox, PostHog/Sentry integration, privacy and retention controls.
- Native live CRUD, real order approvals, background auto-lock, offline conflict resolution, push delivery and token rotation, complete account deletion including owned organizations and subscriptions.
- Convert journal content to MDX if required, add actual testimonials only with permission, final reviewed terms/privacy and verified operator/contact details.
- Measure performance and accessibility against the requested Lighthouse/WCAG goals; complete live E2E, database concurrency/security tests, device tests, and App Store review setup.
- shadcn/ui and NativeWind alignment if those remain architectural requirements. Current components are local React/CSS and React Native StyleSheet.

## Service values still needed

Supabase URL/public/server keys and migration access; selected AI provider/model/key; Stripe test secret, four Price IDs and both webhook signing secrets; Resend verified sender/key; Expo token/project and Apple signing/submission credentials; optional Sentry, PostHog, and VAPID configuration. All environment names and purposes are in each app's `.env.example`.

No real payments, messages, reservations, or AI translation are claimed by the demo. Missing services return explicit unavailable responses. Service credentials alone do not complete the remaining implementation work.

## Recovery note (2026-10-05)

The original sandbox ran out of disk and crashed before any commit reached
GitHub. The source was recovered from the last Vercel upload. Not recovered:
`apps/mobile` (the Expo iOS app was excluded by `.vercelignore`) and the small
`/status` page added afterwards. Both need to be rebuilt.

### Deploying
Vercel (Hobby) blocks CLI deploys whose git commit author is not a member of
the Vercel team. Deploy from a git-free copy:

```bash
git archive HEAD | tar -x -C /tmp/deploy
# add .vercel/project.json (projectId + orgId), then:
npx vercel deploy --prod --yes --token $VERCEL_TOKEN   # run inside /tmp/deploy
```

The CI workflow lives at `docs/ci.workflow.yml`. Move it to
`.github/workflows/ci.yml` from the GitHub web UI (the agent's GitHub app lacks
the `workflow` scope, which is what blocked every earlier push).

## Payments (2026-10-05)

Stripe is connected in **test mode**.

- Host subscriptions: Free (1 property) / Starter $9 / Pro $19 per property per month,
  yearly = 10× monthly. Checkout + Customer Portal; plan is derived from the Stripe
  price lookup key (`stayguide_<plan>_<monthly|yearly>`); quantity follows the
  property count. Verified end to end against production (subscribe → upgrade → cancel).
- Extras: when the host has finished Stripe Connect (Express) onboarding, guests pay
  in Checkout; StayGuide keeps 5% (`application_fee_amount`). Extras that need
  approval are authorised and captured only on approval; decline releases the
  hold; paid extras can be refunded (transfer and fee reversed).
- **Blocked on the platform owner:** activate Connect at
  https://dashboard.stripe.com/connect. Until then hosts see "coming soon" and
  extras fall back to manual requests.
- Re-provision prices/portal/webhook with `pnpm --filter @stayguide/web stripe:setup`
  (env: STRIPE_SECRET_KEY, APP_URL). Going live = run it with the live key and
  store the printed STRIPE_WEBHOOK_SECRET in Vercel.

**Update:** switched to Stripe **live mode**. Live products, prices, portal and webhook
were provisioned with `stripe:setup`; the test-mode webhook was removed and test-mode
customer/subscription ids were cleared from the database. Checkout accepts
promotion codes (use Stripe coupons for founding-host discounts).
