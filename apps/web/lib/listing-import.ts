/**
 * Best-effort import of a public Airbnb listing so hosts can start a guide from a URL they
 * already have. We only read a listing's public page metadata (title, summary, photo, city)
 * to pre-fill the create form — the host always reviews and edits before anything is saved.
 *
 * Security: fetches are restricted to Airbnb's own public domains, every redirect hop is
 * re-checked against that allowlist (so this cannot be turned into an open proxy / SSRF
 * tool for internal hosts), responses are size- and time-capped, and the fetched HTML is
 * treated purely as data.
 */

export type ListingDetails = {
  name: string;
  location: string;
  description: string;
  image: string;
};

const ALLOWED_HOST = /^(?:[a-z0-9-]+\.)*airbnb\.[a-z]{2,3}(?:\.[a-z]{2,3})?$/;

export function isAirbnbUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return host === "abnb.me" || ALLOWED_HOST.test(host);
}

/** Reads one HTML attribute value, tolerating single or double quotes. */
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3] ?? "") : null;
}

/** Collects <meta> og:/name content into a map. */
function metaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const key = (attr(tag, "property") ?? attr(tag, "name"))?.toLowerCase();
    const content = attr(tag, "content");
    if (key && content != null && !(key in out)) out[key] = decodeEntities(content);
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Pulls a readable name out of an Airbnb title ("Loft in Lisbon · ★4.9 · 1 bed" → "Loft in Lisbon"). */
function cleanName(title: string): string {
  return title
    .replace(/\s*[-|]\s*Airbnb.*$/i, "")
    .split("·")[0]
    .replace(/\s*★.*$/, "")
    .trim()
    .slice(0, 120);
}

/** Looks for a city/country in JSON-LD or embedded address fields. */
function findLocation(html: string): string {
  for (const block of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1].trim());
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const a = node?.address;
        if (a && typeof a === "object") {
          const parts = [a.addressLocality, a.addressRegion, a.addressCountry].filter(
            (p): p is string => typeof p === "string" && p.trim().length > 0,
          );
          if (parts.length) return parts.join(", ").slice(0, 200);
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  const locality = html.match(/"addressLocality"\s*:\s*"([^"]{1,80})"/)?.[1];
  const country = html.match(/"addressCountry"\s*:\s*"([^"]{1,80})"/)?.[1];
  const guess = [locality, country].filter((v): v is string => Boolean(v)).map(decodeEntities).join(", ");
  return guess.slice(0, 200);
}

/** Extracts listing details from a listing page's HTML. Pure and testable. */
export function parseListingHtml(html: string): ListingDetails {
  const meta = metaTags(html);
  const title = meta["og:title"] || html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
  let location = findLocation(html);
  const name = cleanName(decodeEntities(title));
  // Fall back to "… in <City>" from the title when no structured address was found.
  if (!location) location = decodeEntities(title).match(/\bin\s+([A-Z][^·|<\n]{1,60})/)?.[1]?.trim() ?? "";
  return {
    name,
    location: location.replace(/\s*[-|]\s*Airbnb.*$/i, "").trim(),
    description: (meta["og:description"] || meta["description"] || "").slice(0, 4000),
    image: meta["og:image"] || "",
  };
}

const MAX_BYTES = 1_500_000;

/** Fetches a listing page over the allowlist, following redirects safely, and parses it. */
export async function fetchListing(rawUrl: string): Promise<ListingDetails> {
  if (!isAirbnbUrl(rawUrl)) throw new Error("Please paste a full Airbnb listing link (airbnb.com/rooms/…).");
  let url = new URL(rawUrl.trim());
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  };
  let response: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    response = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      const next = new URL(location, url);
      if (!isAirbnbUrl(next.toString())) throw new Error("That link redirected somewhere unexpected.");
      url = next;
      continue;
    }
    break;
  }
  if (!response || !response.ok) throw new Error("We couldn’t open that listing. It may be private — add the details by hand below.");

  const reader = response.body?.getReader();
  if (!reader) throw new Error("We couldn’t read that listing.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
      if (total > MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
  }
  const html = new TextDecoder().decode(concat(chunks, total));
  const details = parseListingHtml(html);
  if (!details.name && !details.description) throw new Error("We couldn’t read that listing’s details — add them by hand below.");
  return details;
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk.subarray(0, Math.min(chunk.length, total - offset)), offset);
    offset += chunk.length;
    if (offset >= total) break;
  }
  return out;
}
