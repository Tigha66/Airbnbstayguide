import type { SalesPreviewProperty } from "./sales-preview-data";

/** Unofficial public-information concepts only; owners must review all details before guest use. */
export const additionalSalesPreviewProperties: SalesPreviewProperty[] = [
  {
    slug: "fernwood-libbys-place",
    name: "Libby’s Place",
    operator: "Fernwood Cottages",
    region: "Lake District",
    shortLocation: "Ambleside",
    heroTitle: "A comfortable base in Ambleside",
    intro: "An unofficial guide concept for a ground-floor apartment a short walk from Ambleside, using Fernwood Cottages’ public listing.",
    capacity: "Sleeps 4 · 2 bedrooms · 2 bathrooms",
    highlights: ["Ground-floor apartment", "Five-minute walk to Ambleside centre", "Parking for one car", "Wi-Fi listed"],
    icon: "mountain", accent: "#396c68", tint: "#e8f2ef",
    sourceUrl: "https://fernwoodcottages.co.uk/properties/libbys-place/",
    sections: [
      { title: "Welcome to Ambleside", content: "Fernwood Cottages describes Libby’s Place as a ground-floor apartment about a five-minute walk from central Ambleside. This unofficial concept contains no booking-specific access details or codes." },
      { title: "Inside the apartment", content: "The public listing describes an open-plan kitchen, lounge with Smart TV, DVD player and PlayStation 2, two bedrooms, two bathrooms including a roll-top bath, and a utility room with washing machine and dishwasher." },
      { title: "Parking and essentials", content: "Wi-Fi and off-street parking for one car are listed. The published rules state check-in 4pm, checkout 10am and quiet hours 11pm–7am; no pets, parties, smoking, vaping or extra guests." },
      { title: "Explore locally", content: "Ambleside sits at the northern end of Windermere and the operator lists walking routes, lake activities and local attractions. Confirm current opening times and availability before travelling." },
      { title: "Host confirmation needed", content: "The operator should supply and approve the exact arrival address, key collection, emergency contacts and any booking-specific instructions before a finished guide is shared." }
    ]
  },
  {
    slug: "cornish-escapes-artist-cottage",
    name: "Artist Cottage",
    operator: "Cornish Escapes",
    region: "Cornwall",
    shortLocation: "St Ives",
    heroTitle: "A characterful stay by the sea",
    intro: "An unofficial mobile-guide concept for a St Ives cottage, based on its public layout, outdoor space and nearby harbour-town attractions.",
    capacity: "Three bedrooms · dog friendly",
    highlights: ["Courtyard garden", "Wi-Fi listed", "Off-site parking for one car", "Near harbour and Porthmeor Beach"],
    icon: "cottage", accent: "#34707b", tint: "#e7f3f4",
    sourceUrl: "https://cornish-escapes.com/properties/artist-cottage/",
    sections: [
      { title: "A St Ives welcome", content: "Cornish Escapes describes Artist Cottage as a former fisherman’s cottage on a pedestrian-only street, close to the harbour, town centre and Porthmeor Beach. This is not an official guest guide." },
      { title: "Layout and access", content: "The listing describes three bedrooms, kitchen/diner, sitting room, courtyard and outdoor shower. Access includes granite steps and an internal spiral staircase; the operator warns these may not suit every guest." },
      { title: "Arrival and parking", content: "The public listing gives check-in as 5pm and checkout as 10am. Off-site parking for one car is about 0.2 miles away. This sample omits booking-specific parking directions, access codes and ID procedures." },
      { title: "Useful stay details", content: "Wi-Fi, linen and towels are listed. The operator’s stated dog rules and fee should be checked directly before travel." },
      { title: "Explore locally", content: "The listing highlights the harbour, Porthmeor Beach, Tate St Ives, the Barbara Hepworth Museum, shops, pubs and restaurants. Check current opening times and conditions." }
    ]
  },
  {
    slug: "cotswold-laburnum-cottage",
    name: "Laburnum Cottage",
    operator: "Cotswold Cottage Holidays",
    region: "The Cotswolds",
    shortLocation: "Broadway",
    heroTitle: "A garden cottage in Broadway",
    intro: "An unofficial concept for a dog-friendly Broadway cottage, using public details about its garden, parking and village setting.",
    capacity: "Sleeps 3 · 2 bedrooms",
    highlights: ["Enclosed garden and patio", "Private parking for one car", "Dog friendly", "Wi-Fi listed"],
    icon: "cottage", accent: "#8a6845", tint: "#f4eee4",
    sourceUrl: "https://www.cotswoldcottageholidays.co.uk/laburnum-cottage/",
    sections: [
      { title: "Welcome to Broadway", content: "The operator describes Laburnum Cottage as a quiet cottage on a private drive in Broadway. This independent concept uses public listing facts only." },
      { title: "The cottage", content: "The listing describes two bedrooms, a bathroom, fitted kitchen, lounge, patio access and an enclosed garden. It sleeps three and has private parking for one car." },
      { title: "Arrival timing", content: "The current public FAQ lists check-in from 2pm, completed by 7pm on Monday or Friday arrivals, and checkout by 10:15am. Confirm against each booking confirmation." },
      { title: "Explore locally", content: "The operator places the cottage about three-quarters of a mile from Broadway’s village centre, shops, pubs and restaurants. Check current opening times and transport." },
      { title: "Host confirmation needed", content: "Confirm current pet rules, arrival instructions, Wi-Fi details and emergency contacts with the operator before sharing a finished guide." }
    ]
  },
  {
    slug: "cumbrian-anley-cottage",
    name: "Anley Cottage",
    operator: "Cumbrian Cottage Holidays",
    region: "Lake District",
    shortLocation: "Keswick",
    heroTitle: "A garden retreat in Keswick",
    intro: "An unofficial concept for a contemporary Keswick cottage, highlighting its public listing’s garden, parking, wood burner and nearby walks.",
    capacity: "Sleeps 4 · 2 bedrooms · 1 shower room",
    highlights: ["Private parking for one car", "Enclosed garden", "Wood-burning stove", "Derwentwater listed 0.4 miles away"],
    icon: "mountain", accent: "#51765d", tint: "#eaf2e7",
    sourceUrl: "https://www.cumbriancottageholidays.co.uk/cottages/anley-cottage-keswick/",
    sections: [
      { title: "Welcome to Keswick", content: "The operator describes Anley Cottage as a contemporary cottage within walking distance of Keswick’s shops, bars and pubs. This sample is not connected to a booking." },
      { title: "Living and dining", content: "The listing describes an open-plan lounge with wood-burning stove and Smart TV, plus a kitchen with electric oven, induction hob, fridge, dishwasher, microwave and coffee machine. Guests are asked to bring logs." },
      { title: "Bedrooms and garden", content: "The public information lists a double and twin bedroom, one shower room, a walled garden, private parking for one car and an indoor rack for two bikes. The operator says pets are not allowed." },
      { title: "Arrival and nearby places", content: "The listing gives arrival as 3pm and departure as 10am, and shows free Wi-Fi. It lists Derwentwater and a supermarket 0.4 miles away; confirm current details before travel." },
      { title: "Host confirmation needed", content: "Confirm booking-specific instructions, emergency contacts and any updated facilities with the operator before a finished guide is shared." }
    ]
  },
  {
    slug: "cotswold-gems-greystones-cottage",
    name: "Greystones Cottage",
    operator: "Cotswold Cottage Gems",
    region: "The Cotswolds",
    shortLocation: "Cold Aston, near Bourton-on-the-Water",
    heroTitle: "A historic cottage and garden",
    intro: "An unofficial concept for a 300-year-old village cottage, based on public details about its garden, parking and Cotswold setting.",
    capacity: "Sleeps 6 · 3 bedrooms · dog friendly",
    highlights: ["300-year-old cottage", "Enclosed garden with BBQ", "Private parking for two cars", "Fast Wi-Fi listed"],
    icon: "cottage", accent: "#7a6548", tint: "#f2eee5",
    sourceUrl: "https://www.cotswoldcottagegems.co.uk/greystones-cottage",
    sections: [
      { title: "Welcome to Cold Aston", content: "Cotswold Cottage Gems describes Greystones Cottage as a characterful 300-year-old cottage in Cold Aston, a few minutes from Bourton-on-the-Water. This is an independent, unofficial sample." },
      { title: "A characterful stay", content: "The public page lists three bedrooms, including a king-size room with ensuite, a twin and a garden-view double, plus a family bathroom, ground-floor toilet and living/dining room with log burner." },
      { title: "Garden and essentials", content: "The operator lists parking for two cars, an enclosed garden with BBQ, fast Wi-Fi and a fully equipped kitchen. Confirm current property-specific dog rules and any conditions with the host." },
      { title: "Explore nearby", content: "The operator highlights local walks, village pubs, Birdland, the Cotswold Motoring Museum and nearby villages. Check opening times and transport before travelling." },
      { title: "Host confirmation needed", content: "This sample does not invent check-in, key collection, emergency numbers or access codes. The operator should approve those details before guest use." }
    ]
  }
];
