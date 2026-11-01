import { describe, expect, it } from "vitest";
import { siteLocales, siteText, localeBase, isSiteLocale, siteDir } from "./site-i18n";
import { preferredSiteLocale } from "./locale-negotiation";
import { siteMetadata } from "./site-metadata";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("website translations", () => {
  it("has the same texts in English, French, Spanish, German and Arabic", () => {
    expect(siteLocales).toEqual(["en", "fr", "es", "de", "ar"]);
    const english = shape(siteText("en"));
    for (const locale of siteLocales) {
      expect(shape(siteText(locale)), locale).toEqual(english);
      for (const s of strings(siteText(locale))) expect(s.trim(), locale).not.toBe("");
    }
    expect(siteText("fr").hero.title1).toBe("Moins de gestion.");
    expect(siteText("de").nav.pricing).toBe("Preise");
    expect(siteText("ar").faq.items).toHaveLength(6);
  });
  it("keeps the guest-concierge sample in the visitor's selected language", () => {
    const french = siteText("fr").langs;
    expect(french.demoQuestion).toContain("Quel est le mot de passe");
    expect(french.demoAnswer).toContain("Le réseau est");
    expect(french.demoTag).toContain("français");
    const spanish = siteText("es").langs;
    expect(spanish.demoQuestion).toContain("¿Cuál es la contraseña");
    expect(spanish.demoAnswer).toContain("La red es");
    expect(spanish.demoTag).toContain("español");
    const german = siteText("de").langs;
    expect(german.demoQuestion).toContain("Wie lautet");
    expect(german.demoAnswer).toContain("Das Netzwerk");
    expect(german.demoTag).toContain("Deutsch");
    const arabic = siteText("ar").langs;
    expect(arabic.demoQuestion).toMatch(/[؀-ۿ]/);
    expect(arabic.demoTag).toContain("بالعربية");
  });

  it("keeps placeholders in every language", () => {
    for (const locale of siteLocales) {
      const t = siteText(locale);
      expect(t.pricing.aiMessages).toContain("{n}");
      expect(t.pricing.note).toContain("{code}");
      expect(t.pricing.note).toContain("{symbol}");
      expect(t.roi.note).toContain("{price}");
    }
  });
  it("uses /fr, /es, /de, /ar and right-to-left for Arabic", () => {
    expect(localeBase("en")).toBe("");
    expect(localeBase("de")).toBe("/de");
    expect(isSiteLocale("ar")).toBe(true);
    expect(isSiteLocale("it")).toBe(false);
    expect(siteDir("ar")).toBe("rtl");
    expect(siteDir("fr")).toBe("ltr");
  });
  it("tells Google about every language version", () => {
    const meta = siteMetadata("fr", "/pricing");
    expect(meta.alternates?.canonical).toBe("/fr/pricing");
    expect(meta.alternates?.languages).toMatchObject({ en: "/pricing", fr: "/fr/pricing", ar: "/ar/pricing", "x-default": "/pricing" });
    expect(siteMetadata("en", "").alternates?.canonical).toBe("/");
  });
});

describe("automatic website language", () => {
  it("follows the browser's languages", () => {
    expect(preferredSiteLocale(undefined, "fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(preferredSiteLocale(undefined, "de-DE")).toBe("de");
    expect(preferredSiteLocale(undefined, "ar-MA,ar;q=0.9")).toBe("ar");
    expect(preferredSiteLocale(undefined, "en-GB,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(preferredSiteLocale(undefined, "it-IT,it;q=0.9,es;q=0.5")).toBe("es");
    expect(preferredSiteLocale(undefined, "ja-JP")).toBe("en");
    expect(preferredSiteLocale(undefined, null)).toBe("en");
  });
  it("respects the visitor's own choice", () => {
    expect(preferredSiteLocale("en", "fr-FR")).toBe("en");
    expect(preferredSiteLocale("es", "en-US")).toBe("es");
    expect(preferredSiteLocale("xx", "de")).toBe("de");
  });
});
