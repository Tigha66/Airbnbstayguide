const crypto = require("node:crypto");
const guides = require("../guides");

const notFound = (res) => res.status(404).json({ error: "Sample unavailable" });
function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
}
function getQueryValue(req, key) {
  const value = req.query && req.query[key];
  return Array.isArray(value) ? value[0] : value;
}

module.exports = function sampleHandler(req, res) {
  setSecurityHeaders(res);
  const url = new URL(req.url || "/", "https://sample.invalid");
  const slug = String(getQueryValue(req, "slug") || url.searchParams.get("slug") || "");
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return notFound(res);

  if (req.method === "GET" || req.method === "HEAD") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">
<title>GetStayGuide | Private property sample</title><link rel="stylesheet" href="/public/styles.css">
<script defer src="/public/sample.js"></script>
</head>
<body><main id="sample" data-slug="${slug}"><div class="loading" role="status">Loading your private sample…</div></main></body>
</html>`);
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, HEAD, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let input = req.body;
  if (typeof input === "string") {
    try { input = JSON.parse(input); } catch { return notFound(res); }
  }
  if (!input || typeof input !== "object" || input.slug !== slug || typeof input.token !== "string" || input.token.length < 32 || input.token.length > 128) return notFound(res);

  const guide = guides[slug];
  if (!guide || Date.parse(guide.expiresAt) <= Date.now()) return notFound(res);
  const expected = Buffer.from(guide.tokenHash, "hex");
  const supplied = crypto.createHash("sha256").update(input.token, "utf8").digest();
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return notFound(res);

  const { tokenHash, expiresAt, ...publicGuide } = guide;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(200).json(publicGuide);
};
