const samples = require("../data/samples.json");
const { lookupSample } = require("../lib/access");

const shell = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<title>Private sample guide | GetStayGuide</title>
<link rel="stylesheet" href="/style.css">
<script src="/sample.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><a class="brand" href="/">GetStayGuide</a><span>Property guide sample</span></header>
<main id="main" class="page">
<div class="badge">UNOFFICIAL SAMPLE</div>
<section id="status" class="status" role="status" aria-live="polite">Loading your private sample…</section>
<section id="guide" hidden></section>
<footer class="site-footer">This private preview is an unofficial sample based on public property information. It is not commissioned, endorsed, or approved by the property owner or operator.</footer>
</main>
</body>
</html>`;

function setHeaders(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
}

function readKeys() {
  try { return JSON.parse(process.env.SAMPLE_PREVIEW_KEYS_JSON || "{}"); }
  catch { return {}; }
}

module.exports = function handler(req, res) {
  setHeaders(res);
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  if (req.method === "GET") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(shell);
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const record = lookupSample({ slug, token: body && body.token, samples, keys: readKeys() });
  if (!record) return res.status(404).json({ error: "This sample link is invalid or has expired." });
  return res.status(200).json(record);
};
