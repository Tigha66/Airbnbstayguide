import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { ServiceWorker } from "@/components/service-worker";
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
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${arabic.variable}`}>
      <body>
        {children}
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}
