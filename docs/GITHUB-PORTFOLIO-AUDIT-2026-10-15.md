# GitHub portfolio sale-readiness review — 15 October 2026

## Conclusion

No newly reviewed project is certified fully functional end to end by this review.
StayGuide is the strongest immediate sales candidate because it has a reachable
production deployment and reported live account/database/Stripe configuration.
It still has a verified account-email configuration gap. TurnoverProof and the
food scanner are the next technical candidates for validation, not certified products.

This task assessed subscription/service sales potential, not a business acquisition
valuation. There is no verified revenue, customer count or sale price in this audit.
No sales emails, purchases, live payments or customer account changes were made.

## Scope and method

Authenticated GitHub inventory and paginated repository search returned **778
distinct accessible repositories**. The accompanying CSV is an inventory, not
a claim that every repository has been audited. Selected 16 named repositories
for README/source/tree review, then followed non-default branches for ScopeLock,
QuotePilotAI and DentalFrontAI. Checked four documented public URLs with read-only
HTTP requests. No repository branches were changed or switched.

Did not clone/run all projects, execute their test suites, sign up on their deployed
sites, place telephone calls, or make Stripe payments. Code existence and a 200
response do not establish functional delivery. Results are bounded to the named
files/branches below. Unreviewed branches may contain additional implementation.

## Candidate ranking

| Priority | Project / reviewed branch | Evidence | Sale-readiness assessment |
|---|---|---|---|
| 1 | Airbnbstayguide / current agent/steel-maple-4m6u plus default README | Production status HTTP 200, database/accounts reported OK, Stripe reported live | Best immediate pilot candidate; repair account email and verify real AI and purchase flow before scaling |
| 2 | turnoverproof / default | Substantial Next.js/Supabase app; completion/report services, migrations, auth, billing and tests exist | Promising B2B cleaning-team product; live URL/configuration and full workflow not verified |
| 3 | processedfoodscanner / default | Substantial PWA, scanner/OCR UI, Supabase and one-off Stripe code; documented live app HTTP 200 | Demonstrable consumer app; verify scanning, auth, paid unlock and branding/content rights before paid launch |
| 4 | QuotePilotAI / agent/swift-steel-80qx | Auth, jobs, estimates, PDF, database migrations, Stripe webhook, DB health route | Promising contractor workflow; main contains only README; live deployment and paid fulfillment not verified |
| 5 | website-builder-service / default | Many static business sites, templates, lead and build scripts | Potential custom website service rather than verified SaaS; portfolio URL returned 403; inspect each demo and business details before offering it |
| Hold | CallPilot / default | Express/SQLite lead capture, Stripe code, AI helpers; domain HTTP 200 | Fix identified implementation issues and establish deployment source before selling as complete receptionist |
| Demo | ScopeLock / agent/rapid-steel-xou3 | IndexedDB/demo workflow, mock AI; services/client.ts rejects non-demo mode | Do not sell as live multi-tenant payment product yet |
| Hold | DentalFrontAI / agent/drift-flame-umat | README identifies a different product, HVACDispatch AI, and marks Twilio/OpenAI as planned | Clarify identity and implement/test core voice/SMS promise before marketing |

### StayGuide

Production request: https://www.getstayguide.com/api/v1/status

- Database and host accounts report OK.
- Account email reports missing RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM).
- AI reports only configuration, not a successful real model response.
- Stripe reports live mode; payout ownership, successful checkout and settlements are unverified.
- Default README calls the app a foundation and says Stripe is not wired; the currently
  checked-out branch and production differ. Update documentation after verifying the
  deployed commit rather than treating the old README as current production evidence.

Suggested buyer: independent holiday-rental manager. Offer one-property demonstration
and evaluation; avoid guaranteed savings or claims that citations eliminate all errors.

### TurnoverProof

Sources:
- https://github.com/Tigha66/turnoverproof/blob/main/README.md
- https://github.com/Tigha66/turnoverproof/blob/main/src/lib/services/billing.ts
- https://github.com/Tigha66/turnoverproof/blob/main/src/lib/services/completion.ts

Actual implementation exists beyond a landing page. However, processStripeEvent
inserts a deduplication record before applying the event and treats any insert error
as a duplicate. A later processing failure could leave retries skipped; verify and
fix retry/transaction behavior before certifying paid entitlement delivery.

README warns placeholder environment values can build while remaining nonfunctional
at runtime. EXIT_READINESS contains unchecked ownership, release and metric items.
MRR targets in those documents are goals, not actual revenue.

Next validation: deploy/configure, create two isolated organizations, assign a cleaner,
capture/checklist/photo evidence, approve/export a report, test offline replay and
Stripe test-mode entitlement update/retry.

### Food scanner

Sources:
- https://github.com/Tigha66/processedfoodscanner/blob/main/README.md
- https://github.com/Tigha66/processedfoodscanner/blob/main/GO-LIVE.md
- https://github.com/Tigha66/processedfoodscanner/blob/main/api/checkout.ts
- https://github.com/Tigha66/processedfoodscanner/blob/main/api/webhook.ts

Live URL: https://al-tayebaat-scanner.vercel.app/altayebaat.html (HTTP 200, redirected
to /altayebaat). That establishes page availability only.

Code includes signature-verified Stripe webhook and paid-state checks, but database
upsert errors are not inspected in setPro and account lookup is limited to the first
500 users. Test entitlement delivery and failure recovery. GO-LIVE describes demo mode
and a one-off purchase; a demo unlock is not proof of a real Stripe entitlement.
Keep educational positioning and verify content/image permissions and data attribution;
this review makes no medical efficacy or legal compliance determination.

### CallPilot — concrete blockers in reviewed source

Sources:
- https://github.com/Tigha66/CallPilot/blob/main/server.js
- https://github.com/Tigha66/CallPilot/blob/main/api/stripe.js
- https://github.com/Tigha66/CallPilot/blob/main/api/leads.js

1. server.js installs express.json globally before the Stripe webhook's raw parser,
   which can prevent signature verification from receiving the required raw body.
2. GET /api/subscriptions lacks an authentication middleware in the reviewed router.
   Do not expose customer/subscription data through a public admin endpoint.
3. express.static serves the repository root while SQLite is created in that root.
   Restrict static serving to public assets and put the database outside it.
4. Webhook handling falls back to unsigned JSON when signature configuration is absent;
   fail closed instead.
5. A local SQLite file requires a persistent deployment strategy; it is not automatically
   durable/shared in a serverless deployment.

The live domain returned Next.js HTML while this repository default server is Express.
Therefore these source findings are not confirmed live-domain vulnerabilities. Verify
the deployed source/commit before attributing them to production. No customer-data
endpoint or database file was fetched in this review.

### ScopeLock and branch discovery

- main has only README.
- agent/rapid-steel-xou3 contains substantial UI/domain code.
- services/client.ts throws when appMode is not demo and instantiates DemoStore,
  DemoAuthService, DemoPublicApprovalService and MockAIProvider.

This is direct implementation evidence that the reviewed branch is demo-only despite
its README discussing future Supabase and payment architecture.

### Other initial candidates

The default trees of changeorderAI, COMPLIANCELOG, receipttotax, QRrestaurant and
invoicegenerator contain only README. This says nothing definitive about all their
agent branches. Do not market these default branches as complete apps.

AIRealEstateListingAssistant default README is only “Project”; it needs a source/branch
review before classification. sanco-services-hub and restaurant-qr-flow have generic
Lovable READMEs; their business workflows were not verified. leadflow-dashboard claims
large projected revenue and live metrics, but no underlying financial evidence was
verified. Do not use those projections as customer proof.

QuotePilotAI has real code on agent/swift-steel-80qx even though main and that branch's
README are placeholders. DentalFrontAI has a branch with a product identity mismatch.
Repository size/name/README alone are unreliable selection methods.

## HTTP checks

| URL | Result | Meaning |
|---|---|---|
| https://www.getstayguide.com/api/v1/status | 200, aggregate ok:false | Available; account-email issue |
| https://callpilotvoice.co.uk | 200 | Page reachable; deployed code identity unverified |
| https://al-tayebaat-scanner.vercel.app/altayebaat.html | 200 after redirect | Page reachable; workflows unverified |
| https://quiet-pepper-zzmx.here.now/ | 403 | Portfolio inaccessible from this environment |

## Practical sales order

1. Finish StayGuide's activation/email/AI/payment verification and continue focused demos
   with existing leads; avoid more same-day reminders.
2. Validate TurnoverProof with one real cleaning team before claiming production readiness.
3. Validate the food scanner's paid unlock and positioning before consumer promotion.
4. Test QuotePilotAI's branch and identify its deployed URL as a separate product candidate.
5. Treat static website templates as a custom-delivery service, checking forms, contact
   details, images and business permission for each sale.

Before calling any product fully functional, record an actual signup → core workflow →
payment/test entitlement → cancellation/recovery walkthrough against its deployed commit.
These checks remain outstanding for the newly reviewed projects.

