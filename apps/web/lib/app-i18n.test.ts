import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { appDictionaries, makeTr } from "./app-i18n";

const files = ["components/dashboard.tsx", "components/live.tsx", "components/login.tsx"];
/** Every tr("…") literal used in the host app. */
function usedKeys() {
  const keys = new Set<string>();
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/\btr\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(JSON.parse(`"${m[1]}"`));
  }
  return keys;
}
// Keys passed to tr() through variables (navigation labels, field labels, days, statuses).
const dynamicKeys = [
  "Overview", "Properties", "Guest inbox", "Extras & upsells", "Analytics", "Share kit", "Plans & billing", "Settings", "Guide editor",
  "Street address", "City, country", "Check-in time", "Checkout time", "Wi-Fi network", "Wi-Fi password", "Host phone",
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
  "Wi-Fi & getting connected", "Check-in & arrival", "Local recommendations", "Check-out details",
  "pending", "approved", "declined", "paid", "refunded",
  "past due", "trialing", "canceled", "unpaid",
];

describe("host app translations", () => {
  it("finds the translated texts in the app", () => {
    expect(usedKeys().size).toBeGreaterThan(250);
  });
  it("has French, Spanish, German and Arabic for every text in the dashboard and sign-in page", () => {
    const keys = [...usedKeys(), ...dynamicKeys];
    for (const [locale, dict] of Object.entries(appDictionaries)) {
      const missing = keys.filter((k) => !dict[k]?.trim());
      expect(missing, `${locale} is missing`).toEqual([]);
    }
  });
  it("keeps every {placeholder} in the translations", () => {
    for (const [locale, dict] of Object.entries(appDictionaries))
      for (const [en, text] of Object.entries(dict)) {
        const want = (en.match(/\{\w+\}/g) ?? []).sort();
        const got = (text.match(/\{\w+\}/g) ?? []).sort();
        expect(got, `${locale}: ${en}`).toEqual(want);
      }
  });
  it("translates with values and falls back to English", () => {
    expect(makeTr("fr")("Overview")).toBe("Vue d’ensemble");
    expect(makeTr("de")("Welcome back, {name}. Here’s how your properties are doing.", { name: "Anna" })).toBe("Willkommen zurück, Anna. So laufen Ihre Unterkünfte.");
    expect(makeTr("ar")("{n} properties", { n: 3 })).toBe("3 عقارات");
    expect(makeTr("en")("Overview")).toBe("Overview");
    expect(makeTr("es")("Some text that has no translation")).toBe("Some text that has no translation");
  });
});
