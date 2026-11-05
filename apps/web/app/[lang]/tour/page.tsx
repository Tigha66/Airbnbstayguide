import { notFound } from "next/navigation";
import { GuidedTour } from "@/components/guided-tour";
import { isSiteLocale, siteLocales } from "@/lib/site-i18n";
import { onboardingText } from "@/lib/onboarding-i18n";
export const dynamicParams = false;
export function generateStaticParams() { return siteLocales.filter(l => l !== "en").map(lang => ({ lang })); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return isSiteLocale(lang) ? { title: onboardingText[lang].tour, description: onboardingText[lang].intro } : {};
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSiteLocale(lang) || lang === "en") notFound();
  return <GuidedTour locale={lang} />;
}
