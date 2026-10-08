import type { Metadata } from "next";
import { AppLocaleProvider } from "@/components/app-locale";
import { requestLocale } from "@/lib/request-locale";
export const metadata: Metadata = {
  title: "Host workspace",
  robots: { index: false, follow: false },
};
/** The dashboard follows the visitor's language (their choice on the website, else the browser's). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  return <AppLocaleProvider locale={await requestLocale()}>{children}</AppLocaleProvider>;
}
