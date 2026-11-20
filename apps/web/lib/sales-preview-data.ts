/**
 * Sales-only demonstrations from publicly listed property facts (20 Nov 2026).
 * NOT authorised house manuals. Never publish private access, guest or Wi-Fi credentials here.
 */
export type SalesPreviewSection = { title: string; content: string };
export type SalesPreviewProperty = {
  slug: string;
  name: string;
  operator: string;
  region: string;
  shortLocation: string;
  heroTitle: string;
  intro: string;
  capacity: string;
  highlights: string[];
  icon: "cottage" | "mountain" | "city";
  accent: string;
  tint: string;
  sourceUrl: string;
  sections: SalesPreviewSection[];
};

export const salesPreviewProperties: SalesPreviewProperty[] = [
  {
    slug: "dinas-ddu",
    name: "Dinas-Ddu",
    operator: "Dioni Holiday Cottages",
    region: "North Wales",
    shortLocation: "Near Beddgelert and Porthmadog",
    heroTitle: "Your mountainside escape",
    intro: "A countryside cottage close to walking routes, villages and the natural beauty of Eryri. This example collects useful public guest information in one mobile place.",
    capacity: "Cottage retreat",
    highlights: ["Off-road parking", "Pet-friendly listing", "Outdoor space", "Bike and canoe storage"],
    icon: "mountain",
    accent: "#226c65",
    tint: "#e6f1eb",
    sourceUrl: "https://www.dioni.co.uk/cottage/dinas-ddu/",
    sections: [
      { title: "Your arrival", content: "Dinas-Ddu is in a rural setting between Beddgelert and Porthmadog. **Exact access instructions, the confirmed address and check-in time must come from the operator after booking.** This sample does not provide entry codes." },
      { title: "Parking and storage", content: "The public listing describes off-road parking and a renovated stone outbuilding for secure storage of bicycles and canoes. Confirm any vehicle or equipment arrangements with the host." },
      { title: "Wi-Fi and house information", content: "This space would display the verified network, password, recycling information and house rules when approved by the operator. **No private credentials are included in this public concept.**" },
      { title: "Explore locally", content: "Beddgelert has cafés and pubs and is popular with walkers. Porthmadog is nearby for shops and coastal trips. The Glaslyn Osprey Centre and Welsh Highland Railway are listed as local attractions; check current access and opening times before travelling." },
      { title: "Check-out and assistance", content: "Your confirmed departure time, cleaning checklist and emergency contact details would be supplied by the host in the finished guide. This preview is not connected to a booking or support desk." },
    ],
  },
  {
    slug: "isaacs-cottage",
    name: "Isaac's Cottage",
    operator: "Hexham Holiday Homes",
    region: "Northumberland",
    shortLocation: "Allendale, near Hexham",
    heroTitle: "Welcome to Allendale",
    intro: "A peaceful Northumberland base with countryside walks, village shops and a cosy log burner. The operator currently emails a welcome pack; this concept shows a mobile companion.",
    capacity: "Village cottage",
    highlights: ["Wi-Fi available", "Log burner", "Pet friendly", "Village walks"],
    icon: "cottage",
    accent: "#75543a",
    tint: "#f3ede4",
    sourceUrl: "https://www.hexhamholidayhomes.co.uk/isaacscottage",
    sections: [
      { title: "Getting here", content: "Isaac's Cottage is listed in **Allendale village**. The operator shares the exact address and arrival details after booking. A car is recommended; the public listing also mentions bus service **688** from Hexham." },
      { title: "Inside the cottage", content: "The listing highlights Wi-Fi, towels and linen, a log burner, a washing machine and a rear garden. The network password and safe use instructions would be added after host approval." },
      { title: "Local essentials", content: "Allendale offers a Co-op and village shops, plus cafés and pubs. It is a base for countryside walking and visits towards Hexham. Confirm transport times and venue hours before visiting." },
      { title: "House guidance", content: "The listing presents the cottage as pet friendly and non-smoking. Full house rules, any pet conditions and departure requirements should be confirmed by the operator." },
      { title: "Check-out and support", content: "This sample does not invent check-in, checkout, key safe details or contact numbers. A purchased guide would contain the property team's approved details and emergency guidance." },
    ],
  },
  {
    slug: "rose-suite",
    name: "The Rose Suite",
    operator: "Oakdale Serviced Apartments",
    region: "Surrey",
    shortLocation: "Woking, Surrey",
    heroTitle: "A straightforward city arrival",
    intro: "A bright one-bedroom apartment in Woking with Surrey Hills views. The absence of a staffed reception makes a clear mobile arrival guide particularly useful.",
    capacity: "Sleeps 2 · 1 bedroom",
    highlights: ["24/7 foyer security", "Resident gym", "Wi-Fi available", "No parking"],
    icon: "city",
    accent: "#254f7b",
    tint: "#e8eff7",
    sourceUrl: "https://oakdaleapartments.co.uk/property/the-rose-suite/",
    sections: [
      { title: "Arrival and building access", content: "The public listing places the apartment on the **sixth floor** of a building with **24/7 security personnel in the main foyer**. There is **no reception service**. Entry and guest ID procedures should be confirmed privately by Oakdale; this concept contains no access codes." },
      { title: "Facilities", content: "A residential gym is listed on the ground floor. The apartment has a kitchen, washer-dryer, lift and free wireless internet. Operating instructions and any gym access rules should be approved by the host." },
      { title: "Important house rules", content: "The published house rules say **no pets, events, smoking or children**. The public listing also says **there is no parking** for the apartment. Check your booking documents for the definitive terms." },
      { title: "Woking and local transport", content: "The Rose Suite is located in Woking, with views described towards the Surrey Hills. A finished guide could include the closest station route, food options, shops and practical directions after operator review." },
      { title: "Departure and assistance", content: "Approved checkout times, key return procedures and support contacts would go here in the finished guide. This independent concept does not connect to Oakdale's real guest-support services." },
    ],
  },
];

export function salesPreviewBySlug(slug: string): SalesPreviewProperty | undefined {
  return salesPreviewProperties.find((p) => p.slug === slug);
}
