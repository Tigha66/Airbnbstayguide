# StayGuide launch package

Launch only after the production work in STATUS.md is complete and validated. Do not market the preview as a functioning paid service.

## App Store draft (planned)

> **Planned, not built.** There is no iOS app in this repository yet. This section is a draft for when one exists.

**Name:** StayGuide — Host Companion

**Subtitle:** Thoughtful stays, less work

**Keywords:** host,guest,guidebook,vacation,rental,property,hospitality,concierge,checkin

**Description:**

A great stay starts with a thoughtful host. StayGuide puts your property guides and guest conversations in your pocket, so you can spend less time repeating the little details and more time making people feel at home.

Keep arrival instructions and local knowledge up to date. Review questions that need your personal touch. Manage guest extras and share a beautiful digital guide with one link. Guests can open their guide without creating an account.

Designed for independent hosts and small property teams. A StayGuide host account is required for connected features. Availability of features depends on your account configuration.

This is draft copy for the completed release; remove claims for any feature that has not passed device and integration testing. Do not submit the current demo build as the completed service.

**Screenshot captions:**
1. A great stay starts here.
2. Every little detail, beautifully organized.
3. A little human touch, when it matters.
4. Thoughtful extras. Happier guests.
5. Your guest guide, one tap away.

**App Review:** Provide a dedicated working demo account and clear review notes. Validate Sign in with Apple, account deletion, privacy declarations, camera/Face ID prompts, and push permissions. Do not put subscription purchase buttons or web subscription links in the iOS app. Review storefront-specific requirements before submission.

## Fourteen-day launch plan

1. Recruit five pilot hosts; observe setup rather than leading them through it. Record the baseline number of repeated questions.
2. Build their real guides with permission. Have hosts verify every fact, private access setting, and emergency detail.
3. Test arrival and checkout on guests' own phones, including poor connectivity and offline use.
4. Complete the first real Stripe test-mode extras transaction and refund; verify the host payout ledger.
5. Publish SEO article 1: “Airbnb welcome book template.” Share a useful downloadable outline.
6. Participate in relevant Airbnb host Facebook groups. Ask administrators before promotion; share practical guide tips and invite a few pilots.
7. Join r/airbnb_hosts discussions with useful answers. Follow current community rules; disclose your relationship and avoid unsolicited promotional replies.
8. Share a detailed hosting workflow on BiggerPockets where relevant and permitted; invite feedback on the actual workflow.
9. Send a small, personalized batch of property-manager introductions through an authorized outreach channel. Track responses and opt-outs.
10. Publish SEO article 2: “How to write an Airbnb house manual”; add examples from consenting pilots.
11. Publish SEO article 3: “Early check-in and late checkout: pricing guest extras.” Compare fulfillment cost with revenue honestly.
12. Publish SEO article 4: “Digital guidebook vs. printed welcome book.” Announce the referral offer to existing opted-in hosts.
13. Prepare a Product Hunt demo, real screenshots, founder story, and clear disclosure of supported features. Ask pilot hosts for honest feedback, not incentivized positive reviews.
14. Publish SEO article 5: “Guest messaging templates for a smoother checkout.” Launch publicly if reliability, support, and billing checks pass; otherwise continue the pilot.

## Property manager introduction

Hi [first name] — I noticed [specific, accurate detail about their properties]. I’m building StayGuide to help hosts answer repeat guest questions with a simple digital guide and a concierge grounded in their own house manual. Would a short walkthrough be useful for your team? I’d be happy to set up one property with your permission and measure whether it saves you time. If it’s not relevant, no problem — I won’t follow up.

## Referral offer

One free month per referred property after the referred host completes their first paid month. Issue a subscription credit rather than cash. Cap credits at the referring account’s eligible monthly property charges; exclude self-referrals, canceled/refunded transactions, and duplicate properties. Publish exact eligibility, credit timing, expiry, taxes, and abuse terms before advertising. This is a proposed offer; billing automation is not implemented.

## Manual release work

Apple Developer and App Store Connect setup; verified demo account; domain DNS and HTTPS; Stripe live-mode activation and Connect approval; final legal/operator details; privacy labels, screenshots, support URL, App Store listing, and review notes. Confirm the APIs, payment policies, and community posting rules in force at launch time.
