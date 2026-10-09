# Demo guide: MVP Vacation Homes, The Slopeview at Snowcreek (Sun Valley, ID)

**Goal:** build a real StayGuide guide for one of MVP Vacation Homes' condos *before* contacting them,
so the first email says "I built one of yours already, open it on your phone."

**Why Snowcreek:** MVP lists four condos in the Snowcreek community next to Dollar Mountain (1510, 1537,
1546 and 1572 Snowcreek). They all share check-in after 4:00 PM, check-out before 11:00 AM, a strict
no-pet rule and the Snowcreek clubhouse with hot tub and seasonal pool. One guide covers all four with
small edits. We use 1572 Snowcreek ("The Slopeview | Ski-In Access, Hot Tub, + Mountain Views").

**Sources** (public, checked October 2026):
- https://www.mvpvacationhomes.com/property/673213818444186921/1572-snowcreek (and its `.md` version,
  which MVP publishes for AI agents)
- The sister listings 1510, 1537 and 1546 Snowcreek (same times, same no-pet rule, clubhouse details)
- https://www.mvpvacationhomes.com/faqs (check-in "typically 4:00 PM", early check-in "sometimes",
  digital locks, "call us at (800) 674-9435")
- https://www.mvpvacationhomes.com/local-guide/winter-guide (ski areas, rinks, Black Tie discount)
- https://www.mvpvacationhomes.com/about-us (team names) and https://www.mvpvacationhomes.com/llms.txt
  (towns served, contact)

Every fact below comes from those pages. **Not verified:** whether 1572 uses a digital lock (the FAQ
says "most" homes do), the fireplace type (listed as "Fire place"), and the exact use of the garage.
Door codes and the Wi-Fi password are left as "in your arrival message". **Note for the pitch:** the
listing mentions a "24/7 Concierge available through the MVP Vacation Homes app", so position
StayGuide as the instant, multilingual answer layer and extras seller, not as their first support channel.

---

## Step 1: Create the property (about 5 minutes)

1. Go to **https://www.getstayguide.com/dashboard** and log in.
2. Click **Add property**.
3. Fill in:
   - **Property name:** `The Slopeview at Snowcreek — Sun Valley`
   - **City, country:** `Sun Valley, Idaho`
   - **Street address:** leave empty (Open in Maps will use the town).
   - **Your house manual:** paste the whole block from **Step 2**.
4. Click **Create my guide**.

## Step 2: House manual to paste

Copy everything inside the box. Each `LABEL:` line becomes its own guide section.

```
Welcome to The Slopeview, a newly remodeled condo in the Snowcreek community right next to Dollar Mountain in Sun Valley, cared for by the local team at MVP Vacation Homes. You are a 5-minute walk to Dollar Mountain, 7 minutes to the Sun Valley Symphony Pavilion and about a mile from downtown Ketchum.

ARRIVAL: Check-in is after 4:00 PM. Our housekeeping team is working hard to make sure your home is spotless before you arrive.
Early check-in is sometimes possible. If the home is ready ahead of schedule we're happy to let you know, so just ask.
Most MVP homes use secure digital locks, so there are no keys to pick up. Your entry details are in your arrival message. Please don't share them.

WI-FI: Wi-Fi is included, and there is a dedicated workspace if you need to work. The network name and password are in your arrival message.

HOUSE RULES: Maximum 6 guests. Children and infants are welcome.
This is a no-pet home with zero tolerance. No pets or visitors' pets are allowed on site, because the owners have allergies.
No smoking indoors.
No parties or events.

THE CONDO: Two bedrooms, two bathrooms and a loft over three floors, about 1,000 sq ft.
Downstairs, the primary suite has a king bed, an en suite bathroom with a walk-in shower, and a sliding door to a private deck with views of Baldy. The second bedroom has a queen bed and a bathroom with a soaking tub and shower.
The second floor has the fully stocked kitchen (oven, stove, microwave, dishwasher, coffee maker, toaster, spices), a dining table for six plus bar seating for four, the living room with a fireplace, and an upper deck with seating for six and shade umbrellas.
The third-floor loft has two twin beds and a Peloton bike (bring your own account).
Washer and dryer, hair dryer, iron and ironing board are in the condo. There is heating but no air conditioning.

CLUBHOUSE AND HOT TUB: The Snowcreek recreation center is a short stroll from the condo. It has a year-round hot tub, a seasonal pool, ping pong and a gathering space with a full kitchen.
Pool and hot tub access can be seasonal. If you need something specific, message us and we'll confirm.

PARKING: The condo has a garage.
The free Mountain Rides shuttle stops at the entrance of the Snowcreek complex and runs to River Run and downtown Ketchum, so you can leave the car parked.

SKIING: In the right conditions you can ski right up to the private deck.
Bald Mountain (Baldy) and Dollar Mountain suit all skill levels. Dollar is a 5-minute walk, and the shuttle takes you to River Run on Baldy.
MVP guests get 15% off skis, snowboards and gear at Black Tie Ski Rentals.
Sun Valley sells day and multi-day lift tickets and season passes, plus Nordic Center and Twilight passes.

CHECKOUT: Check-out is before 11:00 AM. Thank you for staying with us!
Please lock the door, follow any departure checklist we send you, and let us know how your stay went.

EMERGENCY: For any emergency, call 911.
If something isn't working, don't panic. Call MVP Vacation Homes on (800) 674-9435. Our local team is here to help, and we'd much rather fix a small problem today.
The condo has smoke and carbon monoxide detectors, a fire extinguisher and a first aid kit.

LOCAL TIPS: Around Snowcreek
- 5 minutes on foot to Dollar Mountain
- 7 minutes to the Sun Valley Symphony Pavilion (summer symphony nights)
- A short walk to the Sun Valley Lodge, the village and the outdoor Sun Valley Ice Rink
- About a mile to downtown Ketchum for dinner and shopping
There is a small trail off the back of the community, a lovely evening walk.
Other rinks in the valley are the historic Hailey Ice Arena and Christina Potters Ice Rink.
For a big day out in winter, Sun Valley Heli Ski offers backcountry powder skiing with discounts for MVP guests (208-622-3108).
Want a breakfast burrito spot, a hidden hiking trail, fly fishing or somewhere to celebrate a birthday? Just ask the MVP team. They probably have an opinion.
```

## Step 3: Property details

Open the new property. In **Property details** (changes save automatically), set:

| Field | Value |
|---|---|
| Check-in | `4:00 PM` |
| Check-out | `11:00 AM` |
| Wi-Fi network | `In your arrival message` |
| Wi-Fi password | leave empty |
| Host phone | `(800) 674-9435` |

New guides get a default cover photo; it can't be changed in the editor yet. That's fine for a demo.

## Step 4: Add 3 extras

Click the extras button (the window titled **"A thoughtful little extra"**) and add these. The prices
are **demo examples**: MVP only says early check-in is "sometimes" possible and publishes no fees, so
tell them they set their own prices.

| Name | Price | Description |
|---|---|---|
| Early check-in (from 1:00 PM) | $50 | Get on the mountain sooner. Confirmed the day before, if the home is ready ahead of schedule. |
| Late checkout (until 1:00 PM) | $50 | One more ski morning or a slow coffee on the deck. Subject to availability. |
| Welcome grocery stock-up | $75 | Arrive to coffee, breakfast basics and snacks already in the kitchen. |

## Step 5: Publish and copy the link
1. Click **Publish**.
2. Copy the guide link (`https://www.getstayguide.com/g/<slug>`) using the share button.

## Step 6: Test it on your phone (and screenshot the answers)

Open the link on your iPhone, tap the **Concierge** tab and ask:

| Question | What it should say |
|---|---|
| What time can we check in? | After 4:00 PM; early check-in sometimes possible if the home is ready, just ask |
| Can we bring our dog? | No: zero-tolerance no-pet home, owners have allergies |
| Is the hot tub open in winter? | Yes, the Snowcreek clubhouse hot tub is year-round; the pool is seasonal |
| How do we get to River Run without driving? | Free Mountain Rides shuttle stops at the Snowcreek entrance |
| Is there a discount on ski rentals? | 15% off at Black Tie Ski Rentals for MVP guests |
| Is there air conditioning? | No, heating only |
| What time is checkout? | Before 11:00 AM |
| ¿A qué distancia está Dollar Mountain? (Spanish) | Answers in Spanish: a 5-minute walk |
| What's the door code? | Doesn't make one up; it's in the arrival message, or hands over to MVP |

Also try **switching the guide's language** (for example to Spanish) and the **Extras** tab.

**Save 2–3 screenshots** (the no-pets answer, the Spanish answer, the Extras tab) to use in a follow-up email.

---

## Step 7: The email to MVP Vacation Homes

Send to **office@mvpvacationhomes.com** (published on their site; phone (800) 674-9435). Their About
page names co-founders and owners Dan and Rachel and general manager Spencer.

**Subject:** I built a StayGuide for your Snowcreek condos
```
Hi Dan, Rachel and Spencer,

I'm Abdelhak, founder of StayGuide. Instead of describing what we do, I
built one for you: a guest guide for The Slopeview at Snowcreek, made
only from your public listing and FAQ.

Open it on your phone: {YOUR GUIDE LINK}

Try asking the concierge "Can we bring our dog?", "Is the hot tub open
in winter?" or "How do we get to River Run without driving?" It answers
instantly, 24/7, in the guest's own language, using only your
information, and sends anything it can't answer (like door codes) to
your team.

Managing homes from McCall and Tamarack to Ketchum and Sun Valley means
a lot of different check-in details, pet rules and amenities for guests
to keep straight. One guide per home keeps every answer right, and it
can sell your early check-in and late checkout automatically.

Would you like me to set it up free for 3 of your homes for 3 months,
so you can see how many messages it takes off your team?

Abdelhak Tirha, Founder, StayGuide
hello@getstayguide.com · https://cal.com/abdelhak-tirha-ovnocv/demo
```

If they reply, offer a 15-minute call (your Cal.com link). Show the guide live, then change one
answer in the dashboard to show how quickly they can edit it themselves.
