import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { salesPreviewBySlug, salesPreviewProperties } from "@/lib/sales-preview-data";
import { SalesPreviewGuide } from "@/components/sales-preview-guide";

export function generateStaticParams() {
  return salesPreviewProperties.map((property) => ({ slug: property.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = salesPreviewBySlug(slug);
  return {
    title: property ? property.name + " — independent mobile guest-guide concept | GetStayGuide" : "Guest guide preview",
    description: property ? "An independent, non-official guest-guide preview for " + property.name + ". Explore mobile guest information and manual WhatsApp sharing." : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = salesPreviewBySlug(slug);
  if (!property) notFound();
  return <SalesPreviewGuide property={property} />;
}
