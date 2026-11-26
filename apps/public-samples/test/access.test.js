const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { lookupSample } = require("../lib/access");

const token = "a".repeat(43);
const sample = { slug: "example-home", propertyName: "Example Home" };
const keys = { "example-home": { tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: "2026-12-01T00:00:00.000Z" } };

test("returns the scoped sample for a valid unexpired token", () => {
  assert.equal(lookupSample({ slug: "example-home", token, samples: [sample], keys, now: Date.parse("2026-11-26T00:00:00Z") }), sample);
});
test("rejects wrong tokens and unknown slugs", () => {
  assert.equal(lookupSample({ slug: "example-home", token: "b".repeat(43), samples: [sample], keys, now: Date.parse("2026-11-26T00:00:00Z") }), null);
  assert.equal(lookupSample({ slug: "another-home", token, samples: [sample], keys, now: Date.parse("2026-11-26T00:00:00Z") }), null);
});
test("rejects expired sample links", () => {
  assert.equal(lookupSample({ slug: "example-home", token, samples: [sample], keys, now: Date.parse("2026-12-01T00:00:00Z") }), null);
});
