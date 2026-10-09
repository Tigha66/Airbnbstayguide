import { describe, expect, it } from "vitest";
import { LEGAL_DETAILS, legalPlaceholders, privacyPolicy, termsOfService } from "./legal";

describe("legal pages", () => {
  it("lists every value still to fill in", () => {
    expect(legalPlaceholders()).toEqual(Object.keys(LEGAL_DETAILS).filter((k) => LEGAL_DETAILS[k as keyof typeof LEGAL_DETAILS].startsWith("[")));
    const filled = { companyName: "Acme Ltd", companyAddress: "1 Road", contactEmail: "privacy@acme.test", governingLaw: "the laws of Spain" };
    const text = JSON.stringify([privacyPolicy(filled), termsOfService(filled)]);
    expect(text).not.toMatch(/\[[A-Z ]+\]/);
    expect(text).toContain("privacy@acme.test");
    expect(text).toContain("the laws of Spain");
  });
  it("states the retention periods the code enforces", () => {
    const text = JSON.stringify(privacyPolicy());
    expect(text).toContain("12 months");
    expect(text).toContain("6 months");
    expect(text).toContain("Download my data");
  });
});
