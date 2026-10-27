/** Trusted destinations for email and billing links. Forwarded headers are not authority. */
export function applicationOrigin(): string {
  const preview = process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_URL : undefined;
  if (preview && !/^[a-z0-9-]+\.vercel\.app$/.test(preview)) throw new Error("Invalid preview origin");
  const raw = preview ? "https://" + preview : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error("Application origin is not configured"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (process.env.NODE_ENV === "production" && !preview && !process.env.NEXT_PUBLIC_APP_URL))
    throw new Error("Application origin must be an HTTPS origin");
  return url.origin;
}
