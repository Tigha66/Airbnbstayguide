import { GuestGuide } from "@/components/guest-guide";
import { demoProperties, type Property } from "@stayguide/shared";
import type { Metadata } from "next";
import { dbConfigured } from "@/lib/db";
import { getPublishedProperty, getUser } from "@/lib/repo";
import { normaliseWhatsAppNumber } from "@/lib/whatsapp";
import { cache } from "react";

// Only expose the pilot OpenWA sender to guests of an explicitly allowlisted host.
// Never expose the gateway API key or enable the sender for another operator.
type PublishedGuide = { property: Property; whatsappPhone: string | null };
const loadProperty = cache(async (slug: string): Promise<PublishedGuide | null> => {
  if (demoProperties.some((p) => p.slug === slug) || !dbConfigured()) return null;
  try {
    const published = await getPublishedProperty(slug);
    if (!published) return null;
    let whatsappPhone: string | null = null;
    const number = normaliseWhatsAppNumber(process.env.OPENWA_GUEST_PHONE || "");
    const allowed = (process.env.OPENWA_HOST_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (number && allowed.length && process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID && process.env.OPENWA_BASE_URL) {
      try {
        const owner = await getUser(published.ownerId);
        if (owner && allowed.includes(owner.email.toLowerCase())) whatsappPhone = number;
      } catch {
        // A WhatsApp configuration lookup must never hide the published guest guide.
      }
    }
    return { property: published.property, whatsappPhone };
  } catch {
    return null;
  }
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = (await loadProperty(slug))?.property ?? demoProperties.find((p) => p.slug === slug);
  return {
    title: p ? `${p.name} — Your guest guide` : "Your guest guide",
    description: p?.description,
    manifest: `/g/${slug}/manifest.webmanifest`,
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await loadProperty(slug);
  return <GuestGuide slug={slug} initial={guide?.property} guestWhatsAppPhone={guide?.whatsappPhone} />;
}
