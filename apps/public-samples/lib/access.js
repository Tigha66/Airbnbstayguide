const { createHash, timingSafeEqual } = require("node:crypto");

function lookupSample({ slug, token, samples, keys, now = Date.now() }) {
  if (typeof slug !== "string" || typeof token !== "string" || token.length < 40 || token.length > 80) return null;
  const sample = samples.find((item) => item.slug === slug);
  const key = keys && keys[slug];
  if (!sample || !key || !/^[a-f0-9]{64}$/.test(key.tokenHash || "")) return null;
  const expiresAt = Date.parse(key.expiresAt || "");
  if (!Number.isFinite(expiresAt) || now >= expiresAt) return null;
  const actual = createHash("sha256").update(token, "utf8").digest();
  const expected = Buffer.from(key.tokenHash, "hex");
  if (!timingSafeEqual(actual, expected)) return null;
  return sample;
}

module.exports = { lookupSample };
