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

  {
    slug: "the-salt-lodge",
    name: "The Salt Lodge",
    operator: "Cornish Gems",
    region: "West Cornwall",
    shortLocation: "Downalong, St Ives",
    heroTitle: "A coastal welcome in St Ives",
    intro: "A public-information concept for Cornish Gems’ split-level St Ives cottage, with practical highlights and local ideas gathered into a mobile-friendly guide.",
    capacity: "Sleeps 6 · 3 bedrooms · 2 bathrooms",
    highlights: ["Two living spaces", "Courtyard outside space", "Allocated parking noted", "Near harbour and beaches"],
    icon: "cottage",
    accent: "#26716d",
    tint: "#e8f3ef",
    sourceUrl: "https://www.cornishgems.com/destinations/west-cornwall/st-ives/the-salt-lodge",
    sections: [
      { title: "Arriving in St Ives", content: "The public listing places The Salt Lodge in the Downalong area of St Ives. The confirmed address, check-in time and entry details must be supplied privately by Cornish Gems after booking. This concept contains no access codes." },
      { title: "A cottage across four floors", content: "The listing describes a split-level cottage with three bedrooms, two bathrooms, a ground-floor kitchen and dining area, and two separate living spaces. It is set over four floors with three internal flights of stairs; guests should review the operator’s accessibility information before booking." },
      { title: "Parking and beach days", content: "The listing notes two allocated parking spaces about a 15-minute uphill walk away. Island Car Park is described as the nearest public car park, around a three-minute walk. Porthmeor is the nearest beach; confirm current parking terms and local conditions before travelling." },
      { title: "Explore locally", content: "The listing highlights St Ives harbour, Porthmeor and Porthgwidden beaches, galleries, Tate St Ives and the Barbara Hepworth Museum. Opening times and seasonal access should be checked with each venue." },
      { title: "Guest details to confirm", content: "The finished guide would add host-approved Wi-Fi details, arrival steps, house rules, emergency contacts and checkout instructions. None of those private details are included in this public concept." },
    ],
  },
  {
    slug: "harveys-corner-cottage",
    name: "Harvey’s Corner Cottage",
    operator: "StayCotswold",
    region: "The Cotswolds",
    shortLocation: "Chadlington, near Charlbury",
    heroTitle: "A village-cottage welcome",
    intro: "A public-information concept for StayCotswold’s three-bedroom Chadlington cottage, bringing the home’s listed features and nearby village essentials into a mobile guide.",
    capacity: "Sleeps 6 · 3 bedrooms · 2 bathrooms",
    highlights: ["Log burner", "Separate garden room", "Tiered garden and BBQ", "Village shop and pub nearby"],
    icon: "cottage",
    accent: "#7a5b3c",
    tint: "#f4eee6",
    sourceUrl: "https://www.staycotswold.com/property/harveys-corner-cottage-3-bed-cotswold-holiday-accommodation/",
    sections: [
      { title: "Getting here", content: "The public listing places Harvey’s Corner Cottage in Chadlington, near Charlbury. The exact address, check-in time and entry instructions should come from the property manager in the pre-arrival message. This concept includes no private access details." },
      { title: "A place to gather", content: "The listing describes three bedrooms for six guests, a family bathroom and ensuite, an open-plan kitchen and sitting room with a log burner, plus a separate garden room. The public listing also notes Wi-Fi; the network and password would be added only after host approval." },
      { title: "Garden and house information", content: "The property listing describes a tiered garden with two seating areas and a gas BBQ. Confirm the house rules, BBQ guidance, safety details and checkout instructions with the property manager." },
      { title: "Around Chadlington", content: "The listing mentions a village shop, butcher and The Tite Inn. Charlbury is a short drive away and has a station with services towards Oxford and London; check current transport times and venue opening hours." },
      { title: "Guest details to confirm", content: "The completed guide would include approved arrival steps, Wi-Fi credentials, house rules, emergency contacts and departure instructions. These private details are intentionally omitted from this public-information concept." },
    ],
  },
];

export function salesPreviewBySlug(slug: string): SalesPreviewProperty | undefined {
  return salesPreviewProperties.find((p) => p.slug === slug);
}
