# StayGuide: Complete Business & Product Brief

> **How to use this document with ChatGPT:** paste this whole file into a new chat, then paste the prompt from section 0 below it.

---

## 0. Prompt to paste after this document

```
You are my business advisor and marketing assistant for StayGuide, the SaaS
product described above. I am the founder. Read the whole brief carefully.

Rules:
- Only use the facts in this brief about what the product does today. If you
  suggest something the product cannot do yet, label it clearly as an idea
  for the future.
- Give practical, step-by-step advice I can act on this week.
- Use simple English (or French if I ask).

First, summarise StayGuide in 5 bullet points so I know you understood it.
Then ask me which of these I want help with:
1. Finding leads in a specific city
2. Writing outreach emails, LinkedIn or WhatsApp messages
3. Writing a house manual for a client
4. Preparing a sales call
5. Creating social media content
6. Planning my next 30 days
```

---

## 1. StayGuide in one sentence

**StayGuide is a digital welcome guide with an AI concierge for holiday-rental hosts.** It turns a host's house information into a beautiful mobile guide that guests open from a link or QR code. An AI answers guests' questions 24/7 in their own language, and the guide sells paid extras such as late checkout, so hosts save time and earn more.

- **Brand:** StayGuide. Main colour teal `#0F766E`. Tone: warm, premium, hospitable.
- **Tagline ideas:** "Every guest feels like a regular." / "The guidebook that pays for itself."
- **Status:** live in production with real accounts, database, AI and live Stripe payments.

### Links
| What | URL |
|---|---|
| Website / landing page | https://stayguide-gamma.vercel.app |
| Live AI demo guide | https://stayguide-gamma.vercel.app/g/sea-breeze-loft |
| Sample guides | https://stayguide-gamma.vercel.app/g/casa-serena · https://stayguide-gamma.vercel.app/g/olive-grove |
| Demo page | https://stayguide-gamma.vercel.app/demo |
| Host login | https://stayguide-gamma.vercel.app/login |
| Pricing | https://stayguide-gamma.vercel.app/pricing |
| Service status | https://stayguide-gamma.vercel.app/status |

---

## 2. The problem

Holiday-rental hosts (Airbnb, Booking.com, Vrbo, direct bookings) have three daily pains:

1. **Repetitive messages.** Guests ask the same questions again and again: "What's the Wi-Fi?", "How do I get the key?", "Where do I park?", "What time is checkout?" Answering takes hours, including at night.
2. **Information guests don't read.** Paper welcome books get lost, PDFs are hard to read on a phone, and long Airbnb messages get ignored. Most of it is in only one language.
3. **Missed income.** Hosts could sell late checkout, early check-in, airport transfers or welcome baskets, but have no easy way to offer and charge for them.

---

## 3. The solution: what StayGuide does

### For guests (no app, no login, no password)
- A **mobile guide** opened from one link or QR code. It can be installed on the home screen and **works offline**.
- Clear sections: **Arrival, Wi-Fi, House rules, Appliances, Parking, Trash, Checkout, Emergency, Local tips**.
- One tap to copy the Wi-Fi password, open the address in Maps, or call the host or emergency services.
- **AI concierge**, available 24/7:
  - answers **in the guest's language**, detected automatically (10+ languages);
  - uses **only that property's guide** and shows which section it used;
  - **never invents answers**: if it doesn't know, it says "I've passed your question to your host" and sends it to the host's inbox;
  - the host's reply appears in the guest's chat.
- **Extras shop** ("Little extras"): guests buy add-ons by card, Apple Pay or Google Pay.

### For hosts (the dashboard, signed in with Google)
| Section | What it does |
|---|---|
| **Properties** | Add a property by pasting an existing house manual. The **AI Guide Builder** organises the text into sections, using only what the host wrote. |
| **Guide editor** | Edit sections, reorder, preview, **Publish / Unpublish**. Autosaves. |
| **Guest inbox** | Questions the AI escalated. The host replies and the guest sees it. |
| **Extras & upsells** | Create extras with prices. Optional "Require my approval before payment". Approve & charge / Decline & release / Refund / Mark as paid. |
| **Analytics** | Guide views, questions asked, AI resolution rate, top questions, extras revenue, AI usage. |
| **Share kit** | Guest link, printable **QR card** (Print / save PDF), ready-made **Airbnb welcome message**. |
| **Plans & billing** | Choose a plan (Stripe Checkout), manage the card (Stripe Customer Portal), **Set up payouts** (Stripe Connect) to receive extras money. |
| **Settings** | Preferences, dark mode, account deletion. |

Without signing in, the dashboard runs as a **demo mode**, with data saved only in the visitor's browser.

---

## 4. How StayGuide works with Airbnb and other platforms

StayGuide **does not connect to the Airbnb account** (Airbnb only opens its API to approved partners), and it doesn't need to. It works **alongside** every platform with one link:

1. The host creates the guide in StayGuide and gets a **link + QR code**.
2. The host pastes the link once into:
   - **Airbnb → Messages → Scheduled messages** (for example, sent 1 day before check-in), and
   - **Airbnb → Listing → Arrival guide** (Check-in instructions / House manual).
3. The same link goes into **Booking.com and Vrbo messages**, the host's **website**, **WhatsApp** and the **QR card** in the property.
4. Every guest receives the guide automatically. **One guide works for every booking channel.**

---

## 5. Pricing and how the business makes money

### Subscription plans (charged per property, per month)
| Plan | Price | Limits |
|---|---|---|
| **Free** | $0 | 1 property, 25 AI messages per month |
| **Starter** | $9 per property per month | up to 20 properties, 300 AI messages per month |
| **Pro** | $19 per property per month | up to 100 properties, 1,500 AI messages per month, branding |

- **Yearly** billing costs 10× the monthly price (2 months free).
- The subscription quantity updates automatically with the number of properties.
- Promotion codes are accepted at checkout (for founding-host or beta discounts).

### Three revenue streams for the founder
1. **Subscriptions (main income).** Hosts pay by card inside the app; Stripe charges automatically every month or year, and the money goes to the founder's Stripe account and then their bank.
2. **5% platform fee on extras.** When a guest buys an extra, Stripe Connect sends 95% to the host and **5% to the founder automatically**. The founder never handles host money.
3. **Done-for-you services** (sold separately, paid in advance by Stripe Payment Link or Invoice). See section 7.

### Example math (illustration, not a promise)
| Paying properties (Starter $9) | Monthly recurring revenue |
|---|---|
| 50 | $450 |
| 150 | $1,350 |
| 300 | $2,700 |
| 1,000 | $9,000 |

Plus setup fees and the 5% on extras, minus Stripe fees (roughly 1.5–3% plus a small fixed fee per payment), hosting and AI costs.

**What the landing page is:** the founder's own shop window and advertising. It is **not** sold to hosts. Hosts pay for the **dashboard + their guest guides**.

---

## 6. Payment safety: how the founder makes sure customers pay

### Subscriptions are enforced automatically
- The card is charged on **Stripe Checkout before** the paid plan unlocks.
- Stripe charges again automatically every period.
- If a payment fails, Stripe retries for a few days (the plan stays active during retries).
- If the customer still doesn't pay, or cancels, **the app automatically moves the account back to the Free plan**: no new properties beyond 1, and the AI limit drops to 25 messages per month.

### Known gap (to fix in the code)
- After a downgrade, properties that already exist **stay published**; only new ones are blocked. Planned fix: automatically unpublish the extra guides when an account is downgraded.
- The automatic downgrade depends on the **Stripe webhook**, which needs a periodic check in Stripe → Developers → Webhooks.

### Rules for services sold by hand
- **Payment in advance** through Stripe Payment Link or Stripe Invoice; no cash or bank transfers from unknown clients.
- Large jobs: **50% before starting and 50% before publishing**.
- Each client **subscribes in their own account**, so billing is in their name and enforced by the app.
- A **one-page agreement** covering the deliverables, price, timeline, payment in advance (non-refundable once work starts), 2 revision rounds, and that the **host is responsible for the accuracy of codes, phone numbers and rules**.
- Keep emails, the agreement and screenshots as evidence in case of a **chargeback**. Stripe **Radar** fraud protection is on by default.
- Register a business, and ask an accountant about **VAT / sales tax** (Stripe Tax can calculate it).

---

## 7. The done-for-you setup service

**Promise to the host: "Give me your information, and I'll deliver a finished, working guide."**

### Setup checklist per property
1. Send the **questionnaire** (section 8) and collect information and photos.
2. **Write the house manual with AI** (section 9).
3. The host confirms codes, times, prices and phone numbers.
4. Video call: the host **signs up with Google** and chooses a plan. The founder pastes the manual and clicks **Create my guide**.
5. Check every section, then click **Publish guide**.
6. Create **2–4 extras** with prices.
7. Help the host **Set up payouts** (Stripe Connect).
8. Set up the **Airbnb Scheduled message** and **Arrival guide** with the guide link.
9. Add the link to **Booking.com / Vrbo** messages or the host's website.
10. Create the **QR card** (Print / save PDF) for the property.
11. **Test on a phone**: ask the AI 3 questions.
12. **After 14 days**: review Analytics with the host, ask for a testimonial and referrals.

Roughly 1–1.5 hours for the first property; faster for each additional one.

### Packages (price ideas)
| Package | Includes | Price |
|---|---|---|
| Basic | Setup only (host already has a manual) | $49 |
| **Complete** (recommended) | Full checklist incl. AI-written manual | $99–$149 |
| Multilingual | Complete + manual in 2–3 languages | +$20 per language |
| Portfolio | Complete for 10 properties | $399–$699 |
| Care plan | Monthly updates (seasonal tips, rules, extras) | $10–$20 per property per month |
| Offer idea | "Free setup if you choose the yearly plan" | — |

---

## 8. Host questionnaire (for Google Forms / Tally)

**Property:** 1) Name, address, how to find the entrance (floor, door, building code). 2) Type and size, maximum guests.
**Arrival:** 3) Check-in time; early check-in possible? (price). 4) Entry method: lockbox (code and location), smart lock, key handover, reception. 5) Directions from airport/station (taxi, metro, price).
**Wi-Fi & tech:** 6) Wi-Fi name and password. 7) TV / streaming, AC / heating.
**Appliances:** 8) Coffee machine, oven, washing machine, dishwasher, etc.
**House rules:** 9) Smoking, pets, parties, visitors, quiet hours, pool.
**Parking & transport:** 10) Where to park (free/paid, price), nearest bus/tram/metro.
**Trash:** 11) Bin location and recycling.
**Checkout:** 12) Time, late checkout (price), guest tasks (keys, towels, trash, dishes).
**Emergency:** 13) Host phone/WhatsApp, local emergency number, nearest hospital and pharmacy. 14) Water valve, electricity box, fire extinguisher.
**Local tips:** 15) Five favourite places (food, café, beach, viewpoint, shop).
**Extras:** 16) Extras to sell with prices (late checkout, early check-in, transfer, breakfast, welcome basket, bike rental, tours, extra cleaning, baby cot).
**Style:** 17) Tone (friendly / professional / luxury), guest languages, first name for sign-off.

---

## 9. Building the house manual with AI

**Important:** the AI must **never invent** information. Codes, passwords, times, prices and phone numbers must come from the host. A wrong door code is a disaster.

### Writing prompt
```
You are an expert holiday-rental host writer. Using ONLY the information below,
write a warm, clear house manual for guests.

Rules:
- Do NOT invent any information (codes, times, prices, phone numbers, places).
  If something is missing, write [MISSING: ...].
- Short sentences and bullet points. Tone: [friendly / professional / luxury].
- Start each section with a label in capitals followed by a colon, exactly:
  ARRIVAL:, WI-FI:, HOUSE RULES:, APPLIANCES:, PARKING:, TRASH:, CHECKOUT:,
  EMERGENCY:, LOCAL TIPS:
- ARRIVAL: step-by-step entry instructions. CHECKOUT: a short checklist.

Host information:
[paste questionnaire answers]
```

### Translation prompt
```
Translate this house manual into [language]. Keep the section labels
(ARRIVAL:, WI-FI:, ...) in English and do not change any codes, numbers,
times or names.
```

### Quality check
Search for `[MISSING`, compare every code, time, price and phone number with the questionnaire, and get written confirmation from the host. Then in StayGuide: **Properties → Add property → paste → Create my guide → check → Publish guide**.

### Example manual (demo property)
```
ARRIVAL: Check-in is from 3:00 PM. The key is in the lockbox to the right of the front door. The code is 4821. The apartment is on the 2nd floor, door B.
WI-FI: Network: SeaView_Guest. Password: sunset2026
HOUSE RULES: No smoking inside. No parties. Quiet hours are from 10:00 PM to 8:00 AM. Pets are not allowed.
APPLIANCES: The coffee machine uses Nespresso capsules (top drawer). The washing machine is in the bathroom; use the 40° quick program.
PARKING: Free street parking on Rua das Flores. A paid garage is 200 m away at Praça do Comércio (15 EUR/day).
TRASH: Recycling bins are at the corner of the street. Yellow for plastic, blue for paper, green for glass.
CHECKOUT: Checkout is by 11:00 AM. Leave the key in the lockbox, put used towels in the bathtub, and take out the trash.
EMERGENCY: Emergency number: 112. Host phone: +351 900 000 000. Nearest pharmacy: Farmácia Central, Rua Augusta 50.
LOCAL TIPS: Best pastel de nata: Manteigaria (5 min walk). Sunset: Miradouro de Santa Catarina. Tram 28 stops 3 minutes away.
```

---

## 10. How hosts work today, and the competition

| Current method | Problems |
|---|---|
| Answering messages by hand (Airbnb, Booking.com, WhatsApp) | Hours of work, slow replies at night |
| Saved replies / Airbnb Scheduled messages | Long text walls; guests still ask |
| Paper welcome book | Seen only on arrival, gets lost, hard to update, one language |
| PDF / Google Doc | Hard to read on a phone, no answers to questions |
| Airbnb's guidebook / Arrival guide | Airbnb guests only; no AI answers; no extras |
| Property management software (Guesty, Hostaway, Lodgify, Hospitable, Smoobu…) | Built for larger operators, more complex and often more expensive |
| Guidebook apps (Touch Stay, Hostfully Guidebooks, Enso Connect, Duve…) | Direct competitors; often more complex or pricier; AI concierge and simple extras not always included |

### Comparison
| Feature | Paper / PDF | Airbnb tools | PMS | Guidebook apps | **StayGuide** |
|---|---|---|---|---|---|
| Guide on guest's phone | Partly | Airbnb guests only | Sometimes | Yes | **Yes** |
| All channels (Airbnb, Booking.com, Vrbo, direct) | Yes | No | Yes | Yes | **Yes** |
| No app/login for guests | Yes | No | Varies | Yes | **Yes** |
| Works offline | Paper only | Partly | Varies | Some | **Yes** |
| AI answers 24/7 | No | No | Some, often paid add-on | Few | **Yes** |
| Answers in guest's language | No | Message translation | Some | Some | **Yes** |
| Escalates unknown questions to host | No | No | Yes | Rarely | **Yes** |
| Sells extras | No | No | Some | Some | **Yes** |
| AI builds the guide from existing text | No | No | No | Rarely | **Yes** |
| Setup | Easy | Easy | Hard | Medium | **Easy (~10 min)** |
| Price | Low | Free | High | Medium | **Low ($9–$19 per property)** |
| Personal done-for-you setup | — | — | Paid onboarding | Rarely | **Yes (founder)** |

### Honest limitations today
- No booking sync with Airbnb or a PMS (the host pastes the link once).
- One Google login per account (no team or agency access yet).
- No guest ID verification, smart-lock integration, cleaning management, or booking-date-based upsell automation.
- Google sign-in is in **testing mode** until the Google app is published (only added test users can sign in).

**Positioning:** "The simple, affordable guest guide with an AI concierge that works with whatever you already use."

---

## 11. Target customers and markets

### Customers, best first
1. **Small property management companies (5–50 properties).** Best fit: pay per property, feel the message pain most.
2. **Co-hosts** managing Airbnbs for owners (usually paid 15–25% of revenue).
3. **Hosts with 2–10 listings.** Easy to reach, quick decisions.
4. **Boutique hotels, aparthotels, riads, guesthouses, villas.** International guests, strong extras potential (transfers, breakfast, tours).
5. **Resellers / partners:** cleaning companies, Airbnb photographers, rental consultants, offered 20–30% recurring commission.

### Markets
| Market | Why |
|---|---|
| USA (Florida, Tennessee, Texas, Arizona) | Largest short-term rental market, English, used to paying for software; more competition |
| Portugal, Spain, Italy | Heavy tourism, multilingual guests, many small managers |
| France | One of Airbnb's largest markets; sell in French |
| UK (London, Edinburgh, Cornwall) | Mature property management market, English |
| Morocco (Marrakech, Agadir, Tangier, Essaouira) | Riads and villas, international guests, French-speaking hosts |
| Dubai | Licensed holiday-home operators with many units |

**Recommended start:** Portugal + Spain (English) **or** France + Morocco (French), one city first.

---

## 12. Lead generation and sales process

### Before outreach (launch checklist)
1. Google Cloud: complete **Branding**, then **Publish app** (so any host can sign in).
2. Own **domain** (for example getstayguide.com), connected in Vercel, plus the new Google redirect URI.
3. **Business email** on that domain, warmed up for 2 weeks before sending volume.
4. Two polished **demo guides** (apartment + villa/riad; English + French).
5. A **test payment** on a second account (subscribe → check plan → cancel → refund).
6. A **1-minute demo video** (paste manual → guide built → guest asks AI → host gets question).
7. A **booking link** for calls (Calendly / Cal.com).

### Lead sources
Google Maps ("vacation rental management [city]", "conciergerie Airbnb [ville]"), LinkedIn (Property Manager, Airbnb co-host, Founder + short-term rental), Airbnb listings managed by companies, host Facebook groups, tourism and rental associations.
Track leads in a sheet: Name | Company | City | Email | Properties | Personal note | Status | Date | Next step.

### Daily outreach targets
| Channel | Per day |
|---|---|
| Cold email + follow-ups (day 3, day 7) | 20–30 |
| LinkedIn connection + message | 10–15 |
| Facebook groups (helpful, not salesy) | 1 post/comment |
| Phone / WhatsApp (where culturally normal) | 5–10 |

**Compliance:** real name, company address and an easy opt-out in every email (CAN-SPAM, GDPR). Email business addresses only, keep it relevant, and be extra careful in Germany (cold email generally needs consent).

### Main outreach email (English)
```
Subject: Fewer "what's the Wi-Fi?" messages at [Company]

Hi [First name],

I saw [Company] manages [~20] stays in [City]. [Personal compliment.]

Quick question: how many hours a week does your team spend answering the same
guest questions (check-in, Wi-Fi, parking, checkout)?

I built StayGuide, a digital guidebook with an AI concierge. Guests open one
link (sent automatically in Airbnb), and the AI answers 24/7 in their own
language, using only your house info. Anything it can't answer comes straight
to you. It also sells extras like late checkout, so it usually pays for itself.

30-second demo on your phone: [demo link]

Would it help if I set up one of your properties for free so you can see it
with real guests?

[Name] · [Company] · [Address]
Not interested? Reply "no" and I won't email again.
```

### Main outreach email (French)
```
Objet : Moins de messages répétitifs pour vos voyageurs

Bonjour [Prénom],

J'ai vu que [Société] gère plusieurs logements à [Ville]. Bravo pour vos avis !

Combien de temps votre équipe passe-t-elle à répondre aux mêmes questions
(arrivée, Wi-Fi, parking, départ) ?

J'ai créé StayGuide : un livret d'accueil digital avec un concierge IA. Le
voyageur ouvre un simple lien (envoyé automatiquement via Airbnb) et l'IA
répond 24h/24 dans sa langue, uniquement à partir de vos informations. Ce
qu'elle ne sait pas vous est transmis. Vous pouvez aussi vendre des extras
(départ tardif, transfert aéroport…).

Démo sur mobile : [lien]

Je peux configurer gratuitement un de vos logements pour tester avec de vrais
voyageurs. Ça vous intéresse ?

[Nom] · [Société] · [Adresse]
Pour ne plus recevoir d'e-mails, répondez « non ».
```

### 15-minute demo call
1. Ask: "How many properties?" and "How do you handle guest questions today?"
2. Let them scan the demo QR and ask the AI a question on **their own phone**.
3. Show the dashboard: paste a manual, and the guide appears.
4. Show the money: "A $20 late checkout sold 3 times a month pays for 6 properties."
5. Close: "Shall I set up your first property today?"

### Objections
| Objection | Answer |
|---|---|
| "Airbnb already has a guidebook." | It can't answer questions, translate, or sell extras, and it only works for Airbnb guests. |
| "Too expensive." | $9/month; one late-checkout sale pays for it twice. |
| "No time." | I'll set it up for you in about 20 minutes. |
| "Will the AI say something wrong?" | It only uses your information; if unsure, it asks you. |
| "Guests don't like apps." | No app or login: it's just a link. |

### 30-second pitch
> "Right now your guests either message you all day or ignore a long PDF. StayGuide turns your house info into a beautiful phone guide with an AI concierge that answers guests 24/7 in their language and only sends you what it can't answer. It works for Airbnb, Booking.com and direct guests, sells extras like late checkout, and costs $9 a month. I'll set it all up for you this week."

---

## 13. Customer success (keeping customers)
- **Week 1:** guide published, Airbnb message active.
- **Week 2:** share Analytics ("The AI answered 42 questions for you this month").
- **Month 1:** suggest a new extra, ask for a testimonial and referrals.
- **Every 3 months:** refresh the guide content.
- **Upsell:** monthly → yearly, Starter → Pro, more properties.

---

## 14. 90-day plan and KPIs
| Days | Goal |
|---|---|
| 1–7 | Launch checklist, demo guides, demo video, start email warm-up |
| 8–30 | 200 leads in one city, 20–30 contacts/day, 10 demo calls, **5 customers**, 3 testimonials |
| 31–60 | Use testimonials, convert free → paid, **10–15 paying accounts**, partner program with 3 cleaning companies |
| 61–90 | Add a second city or country, start content marketing, target **150–300 paid properties** |

**Weekly KPIs:** emails sent → reply rate (target 5%+) → demo calls → setups → paying properties → MRR → churn.

---

## 15. Presentation outline (12 slides)
1. **Title:** StayGuide: Every guest feels like a regular.
2. **Problem:** repetitive messages, unread manuals, missed income.
3. **Solution:** mobile guide + AI concierge + extras shop.
4. **Guest experience:** link/QR, no app, offline, any language (screenshots of the demo guide).
5. **Host dashboard:** properties, AI guide builder, inbox, extras, analytics, share kit.
6. **Works everywhere:** Airbnb, Booking.com, Vrbo, direct, with one link.
7. **Results for hosts:** fewer messages, better reviews, extra revenue.
8. **Pricing:** Free / $9 / $19 per property per month + done-for-you setup.
9. **Comparison:** vs paper/PDF, Airbnb tools, PMS, guidebook apps.
10. **How to start:** 3 steps (send your info → we build it → share the link).
11. **Testimonials / demo:** live demo QR code.
12. **Call to action:** "Free setup for your first property: book a 15-minute call."

---

## 16. Technical summary (for reference)
- **App:** Next.js (React) web app in a Turborepo monorepo (`apps/web`), hosted on **Vercel**.
- **Sign-in:** Auth.js (NextAuth) with **Google** OAuth; JWT sessions.
- **Database:** **Neon** Postgres.
- **AI:** configurable provider for the concierge and guide builder; keyword search fallback if AI is unavailable.
- **Payments:** **Stripe** (Checkout subscriptions, Customer Portal, Connect Express for extras with a 5% application fee, webhooks for plan sync). Live mode.
- **Guest guide:** installable PWA with a service worker for offline use.
- **Other pages:** landing page, pricing, demo, blog (3 SEO articles), terms, privacy, status.
- **Code:** private GitHub repository `Tigha66/Airbnbstayguide`.

## 17. Planned improvements (not built yet)
1. Unpublish extra guides automatically when an account is downgraded.
2. **Agency / team mode** so one person can manage many clients' guides.
3. Custom domain and French version of the website.
4. Customer intake form built into the app.
5. Integrations with PMS tools to send the guide link automatically.
