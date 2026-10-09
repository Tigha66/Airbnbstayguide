import { describe, expect, it } from "vitest";
import { extractListingFromHtml, listingToManual } from "./listing-import";

const fixture = `<!doctype html>
<html>
  <head>
    <meta property="og:title" content="Fallback title" />
    <meta property="og:image" content="https://example.com/fallback.jpg" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "LodgingBusiness",
        "name": "Harbour Flat",
        "description": "Sunny apartment beside the marina.",
        "address": {"addressLocality":"Porto","addressCountry":"Portugal"},
        "amenityFeature": [{"name":"Fast Wi-Fi"},{"name":"Washer"}],
        "checkinTime": "15:00",
        "checkoutTime": "11:00",
        "houseRules": "No smoking. Quiet after 22:00.",
        "image": ["https://example.com/one.jpg", "https://example.com/two.jpg", "https://example.com/three.jpg", "https://example.com/four.jpg"]
      }
    </script>
  </head>
</html>`;

describe("listing import", () => {
  it("extracts useful guide facts from embedded listing metadata", () => {
    const listing = extractListingFromHtml(fixture);
    expect(listing.title).toBe("Harbour Flat");
    expect(listing.location).toBe("Porto, Portugal");
    expect(listing.amenities).toEqual(["Fast Wi-Fi", "Washer"]);
    expect(listing.images).toHaveLength(3);
    expect(listingToManual(listing)).toContain("CHECK-IN: 15:00");
    expect(listingToManual(listing)).toContain("HOUSE RULES: No smoking");
  });
});
