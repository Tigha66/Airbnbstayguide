# StayGuide demo kits: one per prospect

Each file in this folder is a **ready-to-build demo guide** for one property manager, made only from
their public website and listings. Build it in your StayGuide dashboard, test it on your phone, then
send them the link: *"Instead of describing what we do, I built one for you."*

Folders: `us/`, `uk/`, `dubai/`, `spain/`, `portugal/`, `greece/`. The index of all kits is at the
bottom of this file.

---

## How to build any demo (about 15 minutes)

1. **Dashboard → Add property.** Copy *Property name* and *City, country* from the kit. Leave
   *Street address* empty unless the kit gives one.
2. **Your house manual:** paste the whole block from the kit's "House manual to paste" step, then
   click **Create my guide**.
3. **Property details:** copy check-in, check-out, Wi-Fi and host phone from the kit's table. Changes
   save automatically.
4. **Extras:** add the 2–3 extras in the kit's table. Prices are **examples**; say so in the email.
5. **Publish**, then copy the guide link with the share button.
6. **Test it** (checklist below), take 2–3 screenshots, and paste the link into the kit's email.

Rename the guide or unpublish it at any time from the dashboard. Guides aren't listed on Google
(they're marked "noindex"), so only people with the link see them.

---

## Testing checklist (do this before every send)

Open the guide link **on your phone** and check:

| ✓ | Check | Why |
|---|---|---|
| ☐ | Every section opens and reads well (Arrival, Wi-Fi, House rules, Checkout, Local tips) | It's their first impression |
| ☐ | Ask the kit's **test questions** in the Concierge tab; answers match the "expected" column | Proves it uses only their info |
| ☐ | Ask for the **door code** or **Wi-Fi password** | It must NOT invent one; it should say it's in the arrival message, or pass the question to the host |
| ☐ | Ask a question it can't know ("Can I bring 3 dogs?" if the kit doesn't say) | It should hand over to the host, not guess |
| ☐ | Ask one question **in another language** (Spanish, French, Arabic…) | Shows the multilingual feature |
| ☐ | Switch the guide language from the menu at the top | The whole guide translates |
| ☐ | Open the **Extras** tab | Their extras appear with prices |
| ☐ | Turn on **Airplane mode** and reload the guide | It still opens offline (big selling point in mountains and on islands) |
| ☐ | Screenshot: one concierge answer, one non-English answer, the Extras tab | For the follow-up email |

If an answer is wrong, fix the text in the dashboard (Guide sections), not in the kit.

**Before publishing a kit you wrote or edited yourself**, check its manual splits into the right
sections (run from `apps/web`):

```
corepack pnpm exec tsx scripts/check-demo.mts ../../docs/demos/us/wolf-rentals-solitude.md
```

Watch out for lines like `No fires of any kind: …`. A capitalised phrase followed by a colon can be
read as a new section heading. Use a full stop instead.

---

## When a manager replies

- **"How did you get this?"** From your public listing and website only. Nothing private, and you
  haven't contacted their guests.
- **"Is this live for our guests?"** No. It's a private demo link. Only they decide if it's used.
- **"Can we change it?"** Yes. Offer a 15-minute call (Cal.com link), share your screen, and edit one
  section live to show how quickly they can change it.
- **"What does it cost?"** Free for 3 properties for 3 months (promo code `PILOT`). After that, quote
  per property per month in their currency.
- **"Please remove it."** Unpublish or delete it the same day and confirm by email.
- **"Do you work with Hostaway / Guesty / Track / Escapia?"** StayGuide works alongside any booking
  system: they add the guide link to the messages they already send.

---

## Index of demo kits (70)

Each kit names the property used, where its facts came from, what wasn't published (marked **Confirm**), the extras, test questions with expected answers, and the message to send.

### 🇺🇸 United States (42)

| Kit | Property and place |
|---|---|
| [30A Escapes](us/30a-escapes-four-waves.md) | Four Waves (Seacrest Beach, FL) |
| [Abode Vacation](us/abode-vacation-snow-bear.md) | Treetop Lodge at The Snow Bear (Taos Ski Valley, NM) |
| [Beach Condos in Destin](us/beach-condos-in-destin-maravilla.md) | Maravilla 1207 (Miramar Beach, FL) |
| [Beach Retreats](us/beach-retreats-sunshine-and-good-times.md) | Sunshine and Good Times (Holmes Beach, FL) |
| [Beachside Getaway](us/beachside-getaway-springwood-villas.md) | Springwood Villas (Hilton Head Island, SC) |
| [Booe Realty](us/booe-realty-a-place-at-the-beach.md) | A Place at the Beach (Myrtle Beach, SC) |
| [Breathe Easy Rentals](us/breathe-easy-rentals-beach-manor-shell-seeker.md) | Beach Manor 702 "Shell Seeker" at Tops'l (Miramar Beach, FL) |
| [Cabin Rentals of Georgia](us/cabin-rentals-of-georgia-high-hopes.md) | High Hopes (Blue Ridge, GA) |
| [Cactus Vacation Rentals](us/cactus-vacation-rentals-old-town-condo.md) | Heated Pool 1-Bedroom Condo in Old Town (Scottsdale, AZ) |
| [Cascade Vacation Rentals](us/cascade-vacation-rentals-lutsen-log-cabins.md) | Lutsen Log Cabins (Lutsen, MN) |
| [Coast 'N Currents Realty](us/coast-n-currents-captains-cove.md) | Captain's Cove (Nags Head, NC) |
| [Condos-In-Steamboat](us/condos-in-steamboat-storm-meadows-club-a-212.md) | Storm Meadows Club A 212 (Steamboat Springs, CO) |
| [Dry Heat Resorts](us/dry-heat-resorts-haven-house.md) | Haven House at Andreas Hills (Palm Springs, CA) |
| [Flagstaff Vacation Properties](us/flagstaff-vacation-properties-rural-escape-snowbowl.md) | Rural Escape Near Snowbowl (Flagstaff, AZ) |
| [Forever Destin Beach Rentals](us/forever-destin-jade-east-1640.md) | Jade East 1640 (Destin, FL) |
| [Glacier Getaways](us/glacier-getaways-granite-peak-at-the-quarry.md) | Granite Peak at the Quarry (Whitefish, MT) |
| [Haven Vacation Rentals](us/haven-vacation-rentals-valley-view-cabin.md) | Valley View Cabin at Starr Crest Resort (Pigeon Forge, TN) |
| [Heartland Cabin Rentals](us/heartland-cabin-rentals-barefoot-dreams.md) | Barefoot Dreams (Pigeon Forge, TN) |
| [Hocking Hills Premier Cabins](us/hocking-hills-premier-cabins-high-point-lodge.md) | High Point Lodge (Rockbridge, OH) |
| [Homestead Modern](us/homestead-modern-hawk-and-mesa.md) | Hawk & Mesa (Pioneertown, CA) |
| [Jekyll Realty](us/jekyll-realty-villas-by-the-sea.md) | Villas by the Sea (Jekyll Island, GA) |
| [Lucky Savannah](us/lucky-savannah-mcintosh-house.md) | General Lachlan McIntosh House (Savannah, GA) |
| [Marigny Management](us/marigny-management-mid-city-3br.md) | Mid-City 3BR by the Streetcar (New Orleans, LA) |
| [Maui Vision Rentals](us/maui-vision-rentals-kihei-akahi-c313.md) | Kihei Akahi C313 (Kihei, Maui, HI) |
| [MVP Vacation Homes](us/mvp-vacation-homes-snowcreek.md) | The Slopeview at Snowcreek (Sun Valley, ID) |
| [Myrtle Beach Destinations](us/myrtle-beach-destinations-caravelle-resort.md) | Caravelle Resort 745 (Myrtle Beach, SC) |
| [Myrtle Stays](us/myrtle-stays-beach-cove-resort.md) | Beach Cove Resort (North Myrtle Beach, SC) |
| [Nauset Rental](us/nauset-rental-nauset-winds.md) | Nauset Winds (Orleans, MA) |
| [NW Comfy Cabins](us/nw-comfy-cabins-bavarian-mountain-suite.md) | Bavarian Mountain Suite (Leavenworth, WA) |
| [OC Beachfront Rentals](us/oc-beachfront-rentals-belmont-towers-607.md) | Belmont Towers 607 (Ocean City, MD) |
| [Oceanfront Cottage Rentals](us/oceanfront-cottage-rentals-brass-rail-208.md) | Brass Rail 208 (Tybee Island, GA) |
| [Orlando Regional Property Management](us/orlando-regional-property-management-windsor-at-westside.md) | 8887 Geneve Ct (Kissimmee, FL) |
| [Orlando Short Term Rentals](us/orlando-short-term-rentals-fairy-tales-storey-lake.md) | Fairy Tales at Storey Lake (Kissimmee, FL) |
| [Port A Beach House Company](us/port-a-beach-house-sunrise-villas.md) | Sunrise Villas (Port Aransas, TX) |
| [Roadrunner Escapes](us/roadrunner-escapes-scottsdale-casita-villa.md) | 5-Bedroom Villa with Private Casita (Scottsdale, AZ) |
| [Sedona Premier](us/sedona-premier-sunrise-cliffs.md) | Sunrise Cliffs (Sedona, AZ) |
| [Smoky Mountain Escapes](us/smoky-mountain-escapes-whispering-pines.md) | Whispering Pines (Pigeon Forge, TN) |
| [Smoky Woods Retreats](us/smoky-woods-retreats-trailhead-lodges.md) | Trailhead Lodges (Cosby, TN) |
| [Stay Montana](us/stay-montana-saddle-ridge-slopeside.md) | Saddle Ridge Slopeside Retreat (Big Sky, MT) |
| [Vunique Vacations](us/vunique-vacations-the-oasis.md) | The Oasis (Siesta Key, FL) |
| [The Wolf Rentals](us/wolf-rentals-solitude.md) | Solitude Cabins (Estes Park, CO) |
| [Your Lake Vacation](us/your-lake-vacation-knolls-resort.md) | The Knolls Resort (Osage Beach, MO) |

### 🇬🇧 United Kingdom (6)

| Kit | Property and place |
|---|---|
| [The Coppermines Lakes Cottages](uk/coppermines-lakes-cottages-beckside-cottage.md) | Beckside Cottage (Coniston, Lake District) |
| [Host My Property](uk/host-my-property-22a-royal-crescent.md) | 22A The Royal Crescent (Bath) |
| [North Wales Holiday Cottages](uk/north-wales-holiday-cottages-sandbanks-deganwy.md) | Sandbanks (Deganwy, North Wales) |
| [The Cornish Way](uk/the-cornish-way-lillies-lookout.md) | Lillie's Lookout (St Just, West Cornwall) |
| [York Boutique Lets](uk/york-boutique-lets-minsters-keep.md) | Minster's Keep (York) |
| [Your Devon Escape](uk/your-devon-escape-hawkins-dartmouth.md) | Hawkins (Dartmouth, Devon) |

### 🇦🇪 Dubai (7)

| Kit | Property and place |
|---|---|
| [Bespoke Residences & Holiday Homes](dubai/bespoke-residences-north-residence-palm.md) | North Residence (Palm Jumeirah) |
| [Daniels Holiday Homes](dubai/daniels-holiday-homes-liv-marina.md) | Daniels 2BR Liv Marina (Dubai Marina) |
| [Elite LUX Holiday Homes](dubai/elite-lux-holiday-homes-manchester-tower.md) | Chic Studio in Manchester Tower (Dubai Marina) |
| [Livbnb](dubai/livbnb-marina-wharf-2.md) | Marina Wharf High Floor with Open View (Dubai Marina) |
| [One Perfect Stay](dubai/one-perfect-stay-al-majara.md) | Dubai Marina 1BR Waterfront in Al Majara (Dubai Marina) |
| [StayBetterDXB](dubai/staybetterdxb-ocean-heights.md) | Large Marina 2BR in Ocean Heights (Dubai Marina) |
| [Vacay Lettings](dubai/vacay-lettings-iris-blue.md) | Amazing Palm Marina Views 2BR in Iris Blue (Dubai Marina) |

### 🇪🇸 Spain (Costa del Sol) (7)

| Kit | Property and place |
|---|---|
| [Andaluz Apartments](spain/andaluz-apartments-mdn06.md) | Apartment MDN06 (Nerja, Spain) |
| [Easy Rent Málaga](spain/easy-rent-malaga-atico-rincon-de-la-victoria.md) | Magnífico ático frente al mar (Rincón de la Victoria, Spain) |
| [IVI Real Estate](spain/ivi-real-estate-neptune-502.md) | Neptune 502 (Torremolinos / Benalmádena Costa, Spain) |
| [Living4Malaga](spain/living4malaga-seafront-duplex.md) | Seafront Duplex (Pedregalejo, Málaga, Spain) |
| [Málaga Sun Apartments](spain/malaga-sun-apartments-central-rooftop-pool.md) | Central Free Parking Rooftop Pool (Málaga, Spain) |
| [Marbella in Style](spain/marbella-in-style-villa-panda.md) | Villa Panda (Sierra Blanca, Marbella, Spain) |
| [Vacation Marbella](spain/vacation-marbella-puerto-banus-sea-front.md) | Puerto Banús Sea Front (Marbella, Spain) |

### 🇵🇹 Portugal (4)

| Kit | Property and place |
|---|---|
| [Algarve Retreats](portugal/algarve-retreats-villa-caldeira.md) | Villa Caldeira (Lagos, Algarve) |
| [Clever Details](portugal/clever-details-villa-milou.md) | Villa Milou (Vilamoura, Algarve) |
| [Smartavillas](portugal/smartavillas-casa-achada.md) | Casa Achada (Fonte Salgada, Tavira) |
| [YOUROPO Apartments](portugal/youropo-ribeira-porto-1.md) | Ribeira Porto 1 (Porto) |

### 🇬🇷 Greece (4)

| Kit | Property and place |
|---|---|
| [Naxos Vacation Rentals](greece/naxos-vacation-rentals-villa-elaia.md) | Villa Elaia (Kastraki, Naxos) |
| [Prestige Villas of Corfu](greece/prestige-villas-of-corfu-villa-calypso.md) | Villa Calypso (Kassiopi, Corfu) |
| [Rental Property Management Corfu](greece/rental-property-management-corfu-villa-pyrgos.md) | Villa Pyrgos (Liapades, Corfu) |
| [Straycats BnB](greece/straycats-bnb-acropolis-junior-suite.md) | Acropolis Junior Suite (Koukaki, Athens) |

### Not built (no usable public guest pages)
| Company | Why |
|---|---|
| Kona Vacation Rentals (US) | Website wouldn't load during research |
| Tinies in the Smokies (US) | Site is for property owners only; no guest listings |
| Coastal Rentals and Property Management (US) | Site is for property owners only |
| ZiZibreeZi (UK) | Site is for property owners only |
| Brighton Air (UK) | Site is for property owners only; listings are under owners' own Airbnb accounts |
| SuperHost Vacation Homes (Dubai) | Booking site down |
| SunnyCoast HomeStays (Spain) | Site is for property owners only |

For these, send the normal outreach email from the prospects docs instead.
