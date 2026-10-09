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

## Index of demo kits

| Market | Kit | Property used |
|---|---|---|
| US | [The Wolf Rentals](us/wolf-rentals-solitude.md) | Solitude Cabins, Estes Park |
