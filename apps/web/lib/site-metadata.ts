import type { Metadata } from "next";
import { localeBase, siteLocales, siteText, type SiteLocale } from "./site-i18n";

/** Title, description and hreflang alternates for a translated marketing page. */
export function siteMetadata(locale: SiteLocale, page: "" | "/pricing"): Metadata {
  const t = siteText(locale).meta;
  const languages: Record<string, string> = Object.fromEntries(
    siteLocales.map((l) => [l, `${localeBase(l)}${page}` || "/"]),
  );
  languages["x-default"] = page || "/";
  return {
    title: page === "/pricing" ? t.pricingTitle : { absolute: t.title },
    description: t.description,
    alternates: { canonical: `${localeBase(locale)}${page}` || "/", languages },
    openGraph: { title: t.title, description: t.description, locale, type: "website" },
  };
}
