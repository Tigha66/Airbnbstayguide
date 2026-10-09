// Checks that a demo kit's house manual splits into the right guide sections.
// Usage (from apps/web):  corepack pnpm exec tsx scripts/check-demo.mts ../../docs/demos/us/wolf-rentals-solitude.md [more files…]
import { readFileSync } from "node:fs";
import { parseManual } from "../lib/guide-parser";

const expected = ["arrival", "wifi", "rules", "checkout", "emergency", "local"];
let failed = 0;
for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, "utf8");
  // The manual is the first ``` block after the "house manual" step heading.
  const start = text.search(/^##.*(house manual|manual to paste)/im);
  const manual = start >= 0 ? text.slice(start).split("```")[1] : undefined;
  if (!manual) {
    console.log(`✗ ${file}: no house manual block found`);
    failed++;
    continue;
  }
  const sections = parseManual(manual.replace(/^[a-z]*\n/, ""));
  const types = sections.map((s) => s.type);
  const missing = expected.filter((t) => !types.includes(t));
  const ok = missing.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${file.split("/").pop()}: ${sections.map((s) => s.title).join(" · ")}${ok ? "" : `  (missing: ${missing.join(", ")})`}`);
}
process.exit(failed ? 1 : 0);
