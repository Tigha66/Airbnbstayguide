import type { MetadataRoute } from "next";
import { articles } from "@/lib/articles";
import { localeBase, siteLocales } from "@/lib/site-i18n";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.getstayguide.com";
  // Home and pricing exist in every website language (/, /fr, /es, /de, /ar).
  const translated = siteLocales.flatMap((l) => [localeBase(l) || "", `${localeBase(l)}/pricing`]);
  return [...translated, "/blog", ...articles.map((a) => `/blog/${a.slug}`)].map((path) => ({
    url: base + path,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : /^\/(fr|es|de|ar)$/.test(path) ? 0.9 : 0.7,
  }));
}
