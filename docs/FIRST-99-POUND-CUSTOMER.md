# GetStayGuide — First £99 Customer: Release and Sales Checklist
Date: 20 November 2026
Status: Working sales previews available in a safe feature branch. This is a checklist, not a verified payment-processor setup.

## Offer to validate before collecting money
- Product: done-for-you **one-property** mobile guest-guide setup.
- One-time setup price: **GBP £99** (confirm whether tax is included and any VAT obligations before launch).
- Deliverables: owner's approved property overview, arrival/checkout and house information, useful local tips, published shareable guest link, scannable/downloadable QR code, prewritten **manual** WhatsApp sharing message and a handover walkthrough.
- **Not included:** automated OpenWA sending, an AI WhatsApp inbox, verified booking-system integrations, or lifetime free hosting.
- Seller must approve a written delivery timeframe, included revisions, ongoing hosting period, future subscription pricing, cancellation/refund terms, and responsibility for updating guest details before launching paid checkout.
- Customer approval of all guest instructions and brand/photos is required. Never put door codes, Wi-Fi passwords or private emergency contacts in independent sales concepts.

## Current connection blocker
- Available live Stripe connector belongs to **ai-businessgrowth.com** (account `acct_1TTUdUJgeY9ZvHin`). Do **not** create GetStayGuide payment products, prices or payment links under that context.
- The GetStayGuide Stripe account was previously identified as `acct_1Rdzf0G3wnn7CPRM`, but the exact live merchant context and authority must be reconfirmed in Stripe.
- Once the correct GetStayGuide live merchant account is connected and checked: create a **one-time £99 GBP** product/price, create a hosted Stripe Payment Link, set clear product name/description, use a completed-order notification, and test link accessibility. Never run a live charge merely to test the setup.
- Avoid adding a direct 'Pay £99' button until the correct link and seller terms are confirmed.

## Shortlist for three sales demonstrations
1. **Dioni Holiday Cottages — Dinas-Ddu**: public guest feedback requests clearer house, recycling and practical information. Source: https://www.dioni.co.uk/cottage/dinas-ddu/
2. **Hexham Holiday Homes — Isaac's Cottage**: operator says it sends a welcome pack by email after booking. Source: https://www.hexhamholidayhomes.co.uk/isaacscottage
3. **Oakdale Serviced Apartments — The Rose Suite**: no staffed reception; public listing confirms 24/7 foyer security, gym and no parking. Source: https://oakdaleapartments.co.uk/property/the-rose-suite/

## Sale and fulfilment flow
1. Prospect views a **clearly independent, not-owner-endorsed** concept page.
2. Prospect asks for a finished guide, confirms that it is for a property they own or manage, and approves terms.
3. Prospect uses the **correct merchant's** one-off Stripe Payment Link.
4. Collect operator-approved property photos/brand, arrival times and instructions, housekeeping instructions, and local tips through secure channels. Keep codes private and avoid including them in sales preview pages.
5. Publish a real customer guide under the approved host account and verify guest access by phone and QR.
6. Hand over the guide and ask for a review/testimonial only after successful delivery.

## Outreach discipline
- Prior £99 property-specific emails were already sent on 20 Nov 2026. Do not immediately resend.
- Existing 27 Nov individual follow-up automation should screen bounces, opt-outs, replies and recent contact. Previews should be shared only after confirming that they are published, accessible and labelled independently.
- Do not restart a broad 300-person email campaign just because a new demo exists.
- Existing operators using Touch Stay, another digital guide or QR welcome book should not receive a generic 'replace your manual' pitch; assess a distinct pain and procurement intent first.

## Validation
- Lint, typecheck, production build and Playwright browser tests.
- Test each page at 390px viewport, dynamic QR linking to its own page, manual WhatsApp composer and copy/download action.
- Do not change GetStayGuide production OpenWA credentials, guest inbox/webhooks or live Stripe for this sales preview release.
