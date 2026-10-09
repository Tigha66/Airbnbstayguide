import { GuestGuide } from "@/components/guest-guide";
import { demoProperties, type Property } from "@stayguide/shared";
import type { Metadata } from "next";
import { dbConfigured } from "@/lib/db";
import { getPublishedProperty } from "@/lib/repo";
import { cache } from "react";

// Real guides are read from Neon on each request; sample guides stay static.
const loadProperty = cache(async (slug: string): Promise<Property | null> => {
  if (demoProperties.some((p) => p.slug === slug) || !dbConfigured()) return null;
  try {
    return (await getPublishedProperty(slug))?.property ?? null;
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
  const sample = demoProperties.find((p) => p.slug === slug);
  const p = (await loadProperty(slug)) ?? sample;
  return {
    title: p ? `${p.name} — Your guest guide` : "Your guest guide",
    description: p?.description,
    manifest: `/g/${slug}/manifest.webmanifest`,
    // Hosts' guides are private links; only the sample guides (public demos) may be indexed.
    robots: sample ? { index: true, follow: true } : { index: false, follow: false },
    ...(sample ? { alternates: { canonical: `/g/${slug}` } } : {}),
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GuestGuide slug={slug} initial={await loadProperty(slug)} />;
}
