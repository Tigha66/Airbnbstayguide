# GetStayGuide — Guest-support value pilot

## What is implemented in this branch

- Multilingual homepage section explaining arrival experience, repetitive-question reduction and human handoff.
- Interactive scenario calculator using visitor-entered assumptions. No data is sent to the server or persisted.
- Manual pre-arrival and checkout message templates in the host Share Kit. Copying a template does **not** schedule, send or automate messages.
- Host analytics now reports logged assistant replies without escalation and logged escalations separately. A reply-rate percentage is calculated from assistant replies, not from all guest questions.
- No changes to Stripe, live OpenWA gateway, production databases, or booking integrations.

## How to establish evidence with five trial properties

1. Obtain the operator's permission and document the current process: property count, occupancy, arrival methods and current guest-information channel.
2. For two weeks before onboarding, record the number of repeated questions per occupied stay, the handling time per question, and arrival-related support incidents. Do not collect guest access codes or unnecessary personal details.
3. Publish and quality-check an owner-approved guide. Test the QR/link on an actual phone; make the arrival, parking, Wi-Fi and checkout sections easy to find.
4. Send the guide using the host's existing, approved manual communications or scheduling tool. Do not claim native booking-platform automation.
5. For two weeks after onboarding, record the same measures; separate genuine host responses from AI-generated messages and escalations.
6. Compare question rates **per occupied stay** and median staff handling time. Do not describe a decrease as causal proof if booking volume, property mix or staffing changed.
7. Ask the host for a review only after a successfully delivered pilot, with explicit consent to quote results.

## KPI definitions

- **Guest questions**: stored guest-role messages in the GetStayGuide chat, not all questions sent through WhatsApp, phone, Airbnb or email.
- **AI replies without escalation**: assistant-role messages without an escalation flag, not a verified reduction in human work.
- **Escalations**: assistant-role messages explicitly marked as escalated.
- **Reply non-escalation rate**: AI replies without escalation / total assistant replies. Not a verified resolution or customer satisfaction score.
- **Potential staff time savings**: an illustrative model from four assumptions: questions per week, minutes per question, estimated proportion avoided and hourly staff cost. It is not live usage analytics.
- **Measured time saved**: must come from the operator's actual baseline and follow-up logs, adjusted for occupied stays and question categories.

## Production release gates

- End-to-end host signup, verified email, first guide publication and mobile guest QA.
- Correct live Stripe account and confirmed owner-facing checkout/billing acceptance, with separate approval for any charge.
- Secure tenancy and staff access, real guest guide access restrictions, delivery and recovery checks.
- OpenWA sender filtering at gateway, signed webhooks, backups, consent, real-phone delivery; only after those pass may the separate inbox pilot be considered for production.
- Do not present setup instructions for Guesty, Hostaway, Lodgify or other PMS products as live native integrations.

## Suggested sales experiment

Offer one finished, owner-approved guest guide at a disclosed fixed setup price, with separate transparent hosting and subscription terms. Measure calls booked, trial activation, actual property onboarding and payments. Stop bulk outreach if it does not generate qualified discussions.
