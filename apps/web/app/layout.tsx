import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { ServiceWorker } from "@/components/service-worker";
import { isSiteLocale, siteDir, type SiteLocale } from "@/lib/site-i18n";
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
// Arabic guest guides; only downloaded when Arabic text is shown.
const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://www.getstayguide.com",
  ),
  title: {
    default: "StayGuide — A better stay starts here",
    template: "%s | StayGuide",
  },
  description:
    "Beautiful digital guidebooks, a thoughtful AI concierge, and little extras that make every stay extraordinary.",
  applicationName: "StayGuide",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "StayGuide" },
  // Next.js now writes only "mobile-web-app-capable"; older iPhones need Apple's own tag to open
  // a home-screen icon as an app rather than a Safari tab.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  openGraph: {
    title: "StayGuide — Less managing. More hosting.",
    description:
      "Your property. Their perfect stay. Beautiful guest guides with an AI concierge.",
    type: "website",
  },
};
export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
};
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ lang?: string }> }) {
  const { lang } = await params;
  const locale: SiteLocale = lang && isSiteLocale(lang) ? lang : "en";
  return (
    <html lang={locale} dir={siteDir(locale)} className={`${sans.variable} ${display.variable} ${arabic.variable}`}>
      <body>
        {children}
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}
