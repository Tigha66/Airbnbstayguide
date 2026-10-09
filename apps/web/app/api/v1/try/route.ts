import { NextResponse } from "next/server";
import { z } from "zod";
import { demoProperties, propertySchema, type Property } from "@stayguide/shared";
import { parseJsonOrNull } from "@/lib/api";
import { buildSections } from "@/lib/guide-builder";
import { extractTime, extractWifi } from "@/lib/guide-parser";
import { importListing, listingToManual } from "@/lib/listing-import";

const schema = z.object({
  manual: z.string().trim().max(12000).default(""),
  listingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

const buckets = new Map<string, number[]>();
function limited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return true;
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest-guide";
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(`try:${ip}`, 3, 60 * 60 * 1000))
    return NextResponse.json({ error: "You can build three previews per hour. Please try again a little later." }, { status: 429 });

  const parsed = schema.safeParse(parseJsonOrNull(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Paste your guide notes or a valid listing URL." }, { status: 400 });

  let source = parsed.data.manual;
  let listingNotice: string | undefined;
  let image = demoProperties[0].image;
  if (parsed.data.listingUrl) {
    try {
      const listing = await importListing(parsed.data.listingUrl);
      const imported = listingToManual(listing);
      if (!imported) throw new Error("No listing text");
      source = [source, imported].filter(Boolean).join("\n\n");
      image = listing.images[0] ?? image;
    } catch {
      listingNotice = "We couldn't read that listing, so the preview uses the text you pasted.";
    }
  }
  if (source.trim().length < 20)
    return NextResponse.json({ error: listingNotice || "Paste at least a few sentences from your house manual." }, { status: 400 });

  const basics = propertySchema.safeParse({
    name: source.match(/(?:TITLE|PROPERTY|NAME):\s*(.+)/i)?.[1] ?? "Your StayGuide preview",
    location: source.match(/(?:LOCATION|ADDRESS|CITY):\s*(.+)/i)?.[1] ?? "Your destination",
    description: source.slice(0, 600),
  });
  // Public previews have no owner to charge, so they get a small global AI cap in addition to
  // the per-IP preview limit. Past that, the deterministic parser still builds a useful guide.
  const useAi = !limited("try-ai-global", 100, 24 * 60 * 60 * 1000);
  const { sections, ai } = await buildSections(source, useAi);
  const wifi = extractWifi(source);
  const id = crypto.randomUUID();
  const property: Property = {
    ...demoProperties[0],
    ...(basics.success ? basics.data : {}),
    id,
    slug: `${slugify(basics.success ? basics.data.name : "preview")}-${id.slice(0, 6)}`,
    image,
    status: "draft",
    description: basics.success ? basics.data.description : source.slice(0, 600),
    checkIn: extractTime(source, "in") || demoProperties[0].checkIn,
    checkOut: extractTime(source, "out") || demoProperties[0].checkOut,
    wifi: wifi.network,
    wifiPassword: wifi.password,
    hostPhone: "",
    sections,
    extras: [],
  };
  return NextResponse.json({ property, ai, listingNotice });
}
