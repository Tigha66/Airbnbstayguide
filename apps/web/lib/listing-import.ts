export type ListingImport = {
  title?: string;
  description?: string;
  amenities: string[];
  houseRules?: string;
  checkIn?: string;
  checkOut?: string;
  location?: string;
  images: string[];
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const uniq = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

function extractJsonBlocks(html: string) {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].replace(/&quot;/g, '"').trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      /* Ignore malformed third-party JSON. */
    }
  }
  for (const match of html.matchAll(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(match[1].replace(/&quot;/g, '"').trim()));
    } catch {
      /* Ignore malformed embedded app data. */
    }
  }
  return blocks;
}

function walk(value: unknown, visit: (node: Record<string, unknown>) => void) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  const node = value as Record<string, unknown>;
  visit(node);
  for (const child of Object.values(node)) walk(child, visit);
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return text(html.match(re)?.[1]?.replace(/&amp;/g, "&"));
}

export function extractListingFromHtml(html: string): ListingImport {
  const out: ListingImport = { amenities: [], images: [] };
  const candidates = extractJsonBlocks(html);
  for (const block of candidates) {
    walk(block, (node) => {
      out.title ||= text(node.name) || text(node.title) || text(node.headline);
      out.description ||= text(node.description) || text(node.about);
      out.houseRules ||= text(node.houseRules) || text(node.rules);
      out.checkIn ||= text(node.checkinTime) || text(node.checkInTime) || text(node.checkIn);
      out.checkOut ||= text(node.checkoutTime) || text(node.checkOutTime) || text(node.checkOut);
      const address = node.address;
      if (!out.location && address && typeof address === "object") {
        const a = address as Record<string, unknown>;
        out.location = uniq([text(a.addressLocality), text(a.addressRegion), text(a.addressCountry)]).join(", ");
      }
      out.location ||= text(node.location) || text(node.city);
      for (const key of ["amenityFeature", "amenities", "amenity", "features"]) {
        const value = node[key];
        if (Array.isArray(value))
          for (const item of value) out.amenities.push(typeof item === "string" ? item : text((item as Record<string, unknown>)?.name));
        else if (typeof value === "string") out.amenities.push(...value.split(/[,;|]/));
      }
      const image = node.image ?? node.images ?? node.photos;
      if (Array.isArray(image))
        for (const item of image) out.images.push(typeof item === "string" ? item : text((item as Record<string, unknown>)?.url));
      else if (typeof image === "string") out.images.push(image);
    });
  }
  out.title ||= meta(html, "og:title") || meta(html, "twitter:title");
  out.description ||= meta(html, "og:description") || meta(html, "description");
  const ogImage = meta(html, "og:image") || meta(html, "twitter:image");
  if (ogImage) out.images.push(ogImage);
  out.amenities = uniq(out.amenities).slice(0, 30);
  out.images = uniq(out.images).filter((url) => /^https?:\/\//i.test(url)).slice(0, 3);
  return out;
}

export function listingToManual(listing: ListingImport) {
  const lines = [
    listing.title ? `TITLE: ${listing.title}` : "",
    listing.location ? `LOCATION: ${listing.location}` : "",
    listing.description ? `DESCRIPTION: ${listing.description}` : "",
    listing.amenities.length ? `AMENITIES: ${listing.amenities.join(", ")}` : "",
    listing.houseRules ? `HOUSE RULES: ${listing.houseRules}` : "",
    listing.checkIn ? `CHECK-IN: ${listing.checkIn}` : "",
    listing.checkOut ? `CHECKOUT: ${listing.checkOut}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function importListing(url: string): Promise<ListingImport> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "StayGuideBot/1.0 (+https://www.getstayguide.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) throw new Error("Not an HTML listing");
    return extractListingFromHtml(await res.text());
  } finally {
    clearTimeout(timeout);
  }
}
