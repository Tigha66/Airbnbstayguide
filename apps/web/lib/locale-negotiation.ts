// Website languages other than English (served at "/"). Keep in sync with site-i18n.ts.
const locales = ["fr", "es", "de", "ar"];

/** The visitor's website language: their saved choice (cookie), else the browser's preferred languages. */
export function preferredSiteLocale(saved: string | undefined, acceptLanguage: string | null): string {
  if (saved === "en" || (saved && locales.includes(saved))) return saved;
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((x) => x.lang && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  // The first language we support (English included) wins.
  return ranked.find((x) => x.lang === "en" || locales.includes(x.lang))?.lang ?? "en";
}
