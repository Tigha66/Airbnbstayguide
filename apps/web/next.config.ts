import type { NextConfig } from "next";

// Scripts, styles, fonts and API calls only from StayGuide itself (plus Vercel Analytics). Next.js needs inline scripts
// and styles. Photos may come from (and be saved for offline from) any https site. Forms may only go to
// Google sign-in and Stripe; the site can't be framed, and plugins/<base> tricks are blocked.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // https: lets the offline service worker save guide photos hosted on other sites.
  "connect-src 'self' https:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://checkout.stripe.com https://billing.stripe.com https://connect.stripe.com",
].join("; ");
const config: NextConfig = {
  transpilePackages: ["@stayguide/shared"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Browsers ignore this over plain http (local development), so it is safe everywhere.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Features the site never uses are switched off for every page.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), usb=(), payment=()" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
        ],
      },
    ];
  },
};
export default config;
