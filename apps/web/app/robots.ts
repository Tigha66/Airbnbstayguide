import type { MetadataRoute } from "next";
import { demoProperties } from "@stayguide/shared";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Sample guides are public demos; every other /g/ link is a host's private guide.
      allow: ["/", ...demoProperties.map((p) => `/g/${p.slug}`)],
      disallow: ["/dashboard", "/api/", "/g/", "/auth/"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.getstayguide.com"}/sitemap.xml`,
  };
}
