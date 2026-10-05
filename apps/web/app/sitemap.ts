import type { MetadataRoute } from "next";
import { articles } from "@/lib/articles";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://stayguide.app";
  return [
    "",
    "/pricing",
    "/blog",
    ...articles.map((a) => `/blog/${a.slug}`),
  ].map((path) => ({
    url: base + path,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
