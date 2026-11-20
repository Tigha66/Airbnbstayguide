/** Trusted destinations for email and billing links. Forwarded headers are not authority. */
export function applicationOrigin(): string {
  const preview = process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_URL : undefined;
  if (preview && !/^[a-z0-9-]+\.vercel\.app$/.test(preview)) throw new Error("Invalid preview origin");
  // The initial production Vercel setup used NEXT_PUBLIC_SITE_URL.
  // Prefer the canonical app URL but accept the legacy site URL for email and
  // checkout redirects without trusting incoming Host/Forwarded headers.
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const raw = preview ? "https://" + preview : configuredOrigin || "http://localhost:3000";
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error("Application origin is not configured"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (process.env.NODE_ENV === "production" && !preview && !configuredOrigin))
    throw new Error("Application origin must be an HTTPS origin");
  return url.origin;
}
