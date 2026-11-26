import { describe, expect, it } from "vitest";
import { siteLocales } from "./site-i18n";
import { foundingFiveConfirmationEmail } from "./founding-five-email";

describe("Founding Five confirmation email", () => {
  it("states the USD one-time fee, Free plan and hosting dates in all supported languages", () => {
    for (const locale of siteLocales) {
      const email = foundingFiveConfirmationEmail({
        locale,
        startsAt: "2026-11-24T11:42:59.130Z",
        endsAt: "2027-11-24T11:42:59.130Z",
      });
      expect(email.subject).toBeTruthy();
      expect(email.text).toContain("$49 USD");
      expect(email.text).toContain("Supplier is not VAT registered. No UK VAT charged.");
      expect(email.text).toContain(locale === "en" ? "Free plan" : locale === "fr" ? "forfait gratuit" : locale === "es" ? "plan gratuito" : locale === "de" ? "kostenlosen Tarif" : "الخطة المجانية");
      expect(email.text.length).toBeGreaterThan(100);
      expect(email.text).toMatch(locale === "de" ? /12|zwölf/i : /12|twelve/i);
    }
  });
});
