import { describe, expect, it } from "vitest";
import { isAirbnbUrl, parseListingHtml } from "./listing-import";

describe("airbnb url guard", () => {
  it("accepts airbnb domains and short links", () => {
    expect(isAirbnbUrl("https://www.airbnb.com/rooms/12345")).toBe(true);
    expect(isAirbnbUrl("https://airbnb.co.uk/rooms/9")).toBe(true);
    expect(isAirbnbUrl("https://www.airbnb.com.au/rooms/9")).toBe(true);
    expect(isAirbnbUrl("https://abnb.me/abcd")).toBe(true);
  });
  it("rejects look-alike and internal hosts (SSRF guard)", () => {
    expect(isAirbnbUrl("https://airbnb.evil.com/rooms/1")).toBe(false);
    expect(isAirbnbUrl("https://evil-airbnb.com/rooms/1")).toBe(false);
    expect(isAirbnbUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAirbnbUrl("http://localhost/rooms/1")).toBe(false);
    expect(isAirbnbUrl("file:///etc/passwd")).toBe(false);
    expect(isAirbnbUrl("not a url")).toBe(false);
  });
});

describe("listing html parser", () => {
  const html = `<!doctype html><html><head>
    <title>Rental unit in Lisbon · ★4.90 · 1 bedroom · 1 bath - Lisboa - Airbnb</title>
    <meta property="og:title" content="Sunny Loft in Lisbon &amp; Alfama · ★4.90 · 1 bed" />
    <meta property="og:description" content="A bright one-bedroom with river views, steps from the old town." />
    <meta property="og:image" content="https://example.com/photo.jpg" />
    <script type="application/ld+json">{"@type":"LodgingBusiness","address":{"addressLocality":"Lisbon","addressCountry":"Portugal"}}</script>
    </head><body></body></html>`;

  it("extracts a clean name, location, description and image", () => {
    const d = parseListingHtml(html);
    expect(d.name).toBe("Sunny Loft in Lisbon & Alfama");
    expect(d.location).toBe("Lisbon, Portugal");
    expect(d.description).toContain("river views");
    expect(d.image).toBe("https://example.com/photo.jpg");
  });

  it("falls back to the title for location when there is no structured address", () => {
    const d = parseListingHtml(
      `<title>Cabin in Aspen - Airbnb</title><meta property="og:title" content="Cabin in Aspen"/>`,
    );
    expect(d.name).toBe("Cabin in Aspen");
    expect(d.location).toBe("Aspen");
  });

  it("returns empty fields rather than throwing on junk", () => {
    const d = parseListingHtml("<html><head></head><body>nothing</body></html>");
    expect(d).toEqual({ name: "", location: "", description: "", image: "" });
  });
});
