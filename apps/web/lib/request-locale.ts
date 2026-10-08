import { cookies, headers } from "next/headers";
import { preferredSiteLocale } from "./locale-negotiation";
import { isSiteLocale, type SiteLocale } from "./site-i18n";

/** The visitor's language for server-rendered pages: their saved choice, else the browser's. */
export async function requestLocale(): Promise<SiteLocale> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const locale = preferredSiteLocale(c.get("sg_lang")?.value, h.get("accept-language"));
  return isSiteLocale(locale) ? locale : "en";
}
