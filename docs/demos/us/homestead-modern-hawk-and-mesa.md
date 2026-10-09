# Demo guide: Homestead Modern, Hawk & Mesa (Pioneertown, CA)

**Goal:** build a real StayGuide guide for one of Homestead Modern's homes *before* contacting them,
so the first email says "I built one of yours already, open it on your phone."

**Why Hawk & Mesa:** it's one of Homestead Modern's roughly 60 managed homes across Joshua Tree, Yucca
Valley and Pioneertown, and its public listing page is unusually thorough: check-in and check-out
times, house rules, parking and dirt-road notes, pet policy and fees, and driving distances to
Pioneertown and Joshua Tree National Park. Homestead Modern's own homepage currently sends guests to a
static Google Drive PDF ("Explore the Desert") for area information, so a live, searchable StayGuide
guide is an easy, visible upgrade from a plain document.

**Sources** (public, checked October 2026): homesteadmodern.com (homepage, for the "Explore the Desert"
Google Drive link), homesteadmodern.com/rentals/hawk-and-mesa (property details, rules and distances),
homesteadmodern.com/contact-us (contact details) and homesteadmodern.com/pet-friendly (which says pet
fees and rules vary by property and to check the individual listing). The exact street address isn't
published; driving directions are sent after booking, so **Street address** is left empty. Door codes
and the Wi-Fi password are only ever sent to booked guests, so they're left as placeholders below.

---

## Step 1: Create the property (about 5 minutes)

1. Go to **https://www.getstayguide.com/dashboard** and log in.
2. Click **Add property**.
3. Fill in:
   - **Property name:** `Hawk & Mesa`
   - **City, country:** `Pioneertown, California`
   - **Street address:** leave empty (not published; directions are sent after booking).
   - **Your house manual:** paste the whole block from **Step 2**.
4. Click **Create my guide**.

## Step 2: House manual to paste

Copy everything inside the box. Each `LABEL:` line becomes its own guide section.

```
Welcome to Hawk & Mesa, a two-bedroom retreat on a 120-acre private nature preserve in Pipes Canyon, just outside Pioneertown, bordering the Sand to Snow National Monument. The home is looked after by Homestead Modern, who manage around 60 vacation rentals across Joshua Tree, Yucca Valley and Pioneertown.

ARRIVAL: Check-in is from 4:00 PM. The final stretch into Pipes Canyon is on dirt roads, so please drive slowly, especially after rain, and a vehicle with higher ground clearance is a good idea, though four-wheel drive is not required. GPS can send you the wrong way out here, so please follow the turn-by-turn directions sent with your booking rather than your map app. Your door code and the exact directions are both in your arrival message from Homestead Modern.
Arriving after 9 PM needs approval in advance, so let us know if you expect to be late.
Arriving early or leaving late outside the times in this guide is charged at half the nightly rate, so please just ask us first.

WI-FI: High-speed Wi-Fi is provided and is good for streaming or working remotely. The network name and password are in your arrival message. Cell signal varies by carrier out here, so turning on Wi-Fi calling on your phone is a good idea.

HOUSE RULES: The home sleeps up to 6 guests, plus up to 2 additional daytime visitors.
No smoking anywhere on the property. Smoking indoors or on the deck brings a minimum $250 fee.
Open flame is only allowed in the propane fire pit and the BBQ grill. Burning other materials in either one brings a minimum $500 fee.
Dogs are welcome with prior written approval, maximum 2 per stay, for a one-time $100 fee. Please bring your own sheets to protect the furniture and keep dogs leashed outside.
No parties, events or commercial photoshoots without prior written approval from Homestead Modern.
Quiet hours run from 10 PM to 7 AM.
No firearms, RVs, motorcycles or camping on the property.
Everyone in the group must be 21 or older with valid ID.
Please watch children closely around the hot tub and the cowboy pool, and keep glass away from both.

INSIDE THE HOUSE: Open-plan living with 13-foot ceilings, two bedrooms each with a California king bed, and two bathrooms.
The kitchen has high-end appliances, a Keurig and a drip coffee maker.
Washer and dryer, air conditioning and heating, and a smart TV with Bluetooth speakers.
There is a telescope in the house for stargazing on clear desert nights.

HOT TUB AND COWBOY POOL: The hot tub has sweeping canyon views and is available year round. The eight-foot cowboy soaking pool outside is seasonal and only filled in the warmer months. Use both at your own risk, there is no lifeguard, and please keep glass away from the water.

PARKING: There is private driveway parking for up to 4 vehicles, plus an EV charger on site.
Please stick to the driveway and marked areas, since this is a 120-acre preserve with trails guests are welcome to explore on foot.

CHECKOUT: Check-out is by 11:00 AM. Please start the dishwasher if you used it, take out the trash, turn off the fire pit and lights, and lock up on your way out.

EMERGENCY: For any emergency, call 911. For anything about the house itself, call or text Homestead Modern on (760) 299-5010.
Power can go out in storms. Unplanned outages are outside our control and aren't refundable, but please let us know so we can check on things.

LOCAL TIPS: Driving times from Hawk & Mesa:
- 10 minutes: Pioneertown and Pappy & Harriet's
- 18 minutes: Yucca Valley shops and restaurants
- 20 minutes: The Integratron
- 23 minutes: Joshua Tree Village
- 26 minutes: the west entrance of Joshua Tree National Park
- 45 minutes: Palm Springs
The property backs onto the Sand to Snow National Monument, with miles of quiet trails to explore straight from the house. There is a telescope in the house for stargazing, and the High Desert sky out here is some of the darkest in Southern California.
Bring plenty of water for any hike, even a short one, and expect big temperature swings between day and night.
```

## Step 3: Property details

Open the new property. In **Property details** (changes save automatically), set:

| Field | Value |
|---|---|
| Check-in | `4:00 PM` |
| Check-out | `11:00 AM` |
| Wi-Fi network | `In your arrival message` |
| Wi-Fi password | leave empty |
| Host phone | `(760) 299-5010` |

New guides get a default cover photo; it can't be changed in the editor yet. That's fine for a demo.

## Step 4: Add 3 extras

Click the extras button (the window titled **"A thoughtful little extra"**) and add these. Two prices
are **demo examples**: Homestead Modern's real policy charges half the nightly rate for early check-in
or late checkout, which varies by stay, so tell them they set their own prices. The pet fee is their
real published amount.

| Name | Price | Description |
|---|---|---|
| Pet fee (dogs only, max 2) | $100 | Homestead Modern's published one-time fee for an approved dog, subject to prior written approval. |
| Early check-in | $75 (demo example) | Start your desert getaway a little sooner, subject to approval and availability. |
| Late checkout | $75 (demo example) | One more slow desert morning, subject to approval and availability. |

## Step 5: Publish and copy the link
1. Click **Publish**.
2. Copy the guide link (`https://www.getstayguide.com/g/<slug>`) using the share button.

## Step 6: Test it on your phone (and screenshot the answers)

Open the link on your iPhone, tap the **Concierge** tab and ask:

| Question | What it should say |
|---|---|
| What time can we check in? | 4:00 PM; door code and directions are in the arrival message |
| Do we need a 4WD vehicle for the dirt road? | 4WD not required, but drive slowly and higher clearance helps |
| Can we bring our dog? | Yes, dogs only, max 2, with prior written approval and a $100 fee |
| Is the cowboy pool open in December? | No, it's seasonal (warm months only); the hot tub is year round |
| What are the quiet hours? | 10 PM to 7 AM |
| How far is Joshua Tree National Park? | About 26 minutes to the west entrance |
| Can we have a campfire on the ground? | No, open flame only in the propane fire pit and BBQ grill |
| ¿A qué hora es el check-out? (Spanish) | Answers in Spanish: 11:00 AM |
| What's the door code? | Doesn't make one up; hands over to the host |

Also try **switching the guide's language** (for example to Spanish) and the **Extras** tab.

**Save 2–3 screenshots** (the dirt-road answer, the Spanish answer, the Extras tab) to use in a
follow-up email.

---

## Step 7: The email to Homestead Modern

Their site doesn't name an individual contact, so email their published address directly, or use the
form at **homesteadmodern.com/contact-us**.

**Subject:** I built a StayGuide for Hawk & Mesa
```
Hi Homestead Modern team,

I'm Abdelhak, founder of StayGuide. Instead of describing what we do, I
built one for you: a guest guide for Hawk & Mesa, made only from your
public listing.

Open it on your phone: {YOUR GUIDE LINK}

Try asking the concierge "Do we need a 4WD vehicle for the dirt road?",
"Is the cowboy pool open in December?" or "Can we have a campfire?" It
answers instantly, 24/7, in the guest's own language, using only your
information, and sends anything it can't answer (like door codes) to
your team.

I noticed your homepage points guests to a Google Drive PDF ("Explore
the Desert") for area information. A StayGuide guide covers that plus
check-in, rules and the extras you offer, in a link you can drop
straight into the same arrival message you already send across your
roughly 60 homes.

Would you like me to set it up free for 3 of your homes for 3 months,
so you can see how many messages it takes off your team?

Abdelhak Tirha, Founder, StayGuide
hello@getstayguide.com · https://cal.com/abdelhak-tirha-ovnocv/demo
```

If they reply, offer a 15-minute call (your Cal.com link). Show the guide live, then change one
answer in the dashboard to show how quickly they can edit it themselves.
