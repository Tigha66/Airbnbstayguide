import type { MetadataRoute } from "next";

/**
 * The website as an installable app. Without it, "Add to Home Screen" on iPhone made a plain
 * bookmark that opened in a Safari tab instead of the offline-capable app. Guest guides set
 * their own manifest (app/g/[slug]/manifest.webmanifest).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "StayGuide",
    short_name: "StayGuide",
    description: "Beautiful digital guidebooks with an AI concierge for every stay.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f9f5",
    theme_color: "#0f766e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
