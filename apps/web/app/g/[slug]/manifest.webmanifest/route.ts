import { NextResponse } from "next/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const path = `/g/${encodeURIComponent(slug)}`;
  return NextResponse.json(
    {
      id: path,
      name: "StayGuide — Your guest guide",
      short_name: "StayGuide",
      description: "All the little details for a lovely stay.",
      start_url: path,
      scope: "/g/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f8f9f5",
      theme_color: "#0f766e",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
