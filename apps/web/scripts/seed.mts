/**
 * Seeds a real, database-backed demo guide ("Sea Breeze Loft") owned by a demo host.
 * Run from apps/web:  DATABASE_URL=... [HF_TOKEN=...] npx tsx scripts/seed.mts
 * Idempotent: re-running replaces the demo property. Uses the AI guide builder when HF_TOKEN is set.
 */
import { query } from "../lib/db";
import { upsertUser } from "../lib/repo";
import { buildSections } from "../lib/guide-builder";
import { aiConfigured } from "../lib/ai";
import { extractWifi } from "../lib/guide-parser";
import type { Property } from "@stayguide/shared";

const MANUAL = `Welcome to Sea Breeze Loft! Check-in is from 3:00 PM, checkout by 11:00 AM.
ARRIVAL: The building door code is 4821. Take the lift to the 3rd floor, door 3B. Keys are in the lockbox to the right of the door, code 1590.
WI-FI: Network "SeaBreeze_Guest", password "Playa2026".
HOUSE RULES: No smoking, no parties, quiet hours 10 PM – 8 AM. Max 4 guests.
APPLIANCES: The Nespresso machine is on the kitchen counter; capsules are in the top drawer. Washing machine: program 4 (40°C), detergent under the sink.
PARKING: No private parking. Use Saba Parking on Carrer de Pujades 50 (about €25/day).
TRASH: Bins are on the street corner. Grey = general, yellow = plastic, blue = paper, green = glass.
CHECKOUT: Load the dishwasher, take out the trash, leave keys in the lockbox.
EMERGENCY: Call 112. Host phone: +34 600 000 000.
LOCAL TIPS: Breakfast at Café Mar (2 min walk). Bogatell Beach is 5 min away. Try La Pubilla for lunch.`;

const ID = "demo-sea-breeze-loft";
const SLUG = "sea-breeze-loft";

const host = await upsertUser("demo@stayguide.app", "Demo Host");
await query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [host.id]);
const { sections, ai } = await buildSections(MANUAL, aiConfigured());
const wifi = extractWifi(MANUAL);
const property: Property = {
  id: ID,
  slug: SLUG,
  name: "Sea Breeze Loft",
  location: "Barcelona, Spain",
  image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80",
  status: "published",
  description: "A bright loft five minutes from Bogatell Beach. Everything you need for a wonderful stay is right here.",
  checkIn: "3:00 PM",
  checkOut: "11:00 AM",
  wifi: wifi.network || "SeaBreeze_Guest",
  wifiPassword: wifi.password || "Playa2026",
  hostPhone: "+34 600 000 000",
  sections,
  extras: [
    { id: "late-checkout", name: "Late checkout until 2 PM", description: "Enjoy a slow last morning.", price: 3000, icon: "sun", approval: true },
    { id: "early-checkin", name: "Early check-in from 12 PM", description: "Drop your bags and head to the beach.", price: 2500, icon: "key", approval: true },
    { id: "airport", name: "Airport transfer", description: "Private car from BCN airport to the door.", price: 4500, icon: "car", approval: true },
  ],
} as Property;
await query(`DELETE FROM properties WHERE id = $1 OR slug = $2`, [ID, SLUG]);
await query(`INSERT INTO properties (id, owner_id, slug, status, data) VALUES ($1, $2, $3, 'published', $4)`, [
  ID,
  host.id,
  SLUG,
  JSON.stringify(property),
]);
console.log(`Seeded ${property.name} with ${sections.length} sections (${ai ? "AI builder" : "manual parser"}) → /g/${SLUG}`);
