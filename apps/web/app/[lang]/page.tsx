import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { isSiteLocale, siteLocales } from "@/lib/site-i18n";
import { siteMetadata } from "@/lib/site-metadata";

// Only /fr, /es, /de and /ar exist; anything else is a 404. English is served at "/".
export const dynamicParams = false;
export function generateStaticParams() {
  return siteLocales.filter((l) => l !== "en").map((lang) => ({ lang }));
}
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return isSiteLocale(lang) ? siteMetadata(lang, "") : {};
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSiteLocale(lang) || lang === "en") notFound();
  return <HomePage locale={lang} />;
}
