import { describe, it, expect } from "vitest";
import {
  priceFor,
  applicationFee,
  conciergeSystemPrompt,
  demoAnswer,
  demoProperties,
  chatSchema,
  starterTemplates,
  templateById,
  sectionSchema,
} from "./index";
describe("billing rules", () => {
  it("charges ten months annually", () => {
    expect(priceFor("pro", 3, true)).toBe(570);
    expect(priceFor("starter", 2)).toBe(18);
  });
  it("rejects invalid quantities", () => {
    for (const quantity of [0, -1, 1.5, 101, NaN])
      expect(() => priceFor("pro", quantity)).toThrow();
  });
  it("computes a five percent fee in cents", () => {
    expect(applicationFee(3500)).toBe(175);
    expect(applicationFee(999)).toBe(50);
    expect(() => applicationFee(-1)).toThrow();
  });
});
describe("guest safeguards", () => {
  it("bounds public input", () => {
    expect(chatSchema.safeParse({ message: "x".repeat(2001) }).success).toBe(
      false,
    );
  });
  it("grounds answers and escalates unknown questions", () => {
    expect(
      demoAnswer(demoProperties[0], "When is checkout?").citations,
    ).toEqual(["Until next time"]);
    expect(
      demoAnswer(demoProperties[0], "Write me a business plan").escalate,
    ).toBe(true);
  });
  it("treats guide text as untrusted and requires citations", () => {
    const prompt = conciergeSystemPrompt("sample", "fr");
    expect(prompt).toContain("untrusted");
    expect(prompt).toContain("Cite");
    expect(prompt).toContain("escalate=true");
    expect(prompt).toContain("reply in fr");
  });
});
describe("starter templates", () => {
  it("offers the six property types", () => {
    expect(starterTemplates.map((t) => t.id)).toEqual([
      "apartment", "villa", "cabin", "city-flat", "beach-house", "hotel-room",
    ]);
  });
  it("seeds valid sections with unique ids", () => {
    for (const template of starterTemplates) {
      expect(template.sections.length).toBeGreaterThanOrEqual(5);
      const ids = template.sections.map((s) => s.id);
      expect(new Set(ids).size, `${template.id} has unique ids`).toBe(ids.length);
      for (const section of template.sections)
        expect(sectionSchema.safeParse(section).success, `${template.id}/${section.id}`).toBe(true);
    }
  });
  it("includes the core stay sections in every template", () => {
    for (const template of starterTemplates) {
      const types = template.sections.map((s) => s.type);
      expect(types).toContain("arrival");
      expect(types).toContain("wifi");
      expect(types).toContain("checkout");
    }
  });
  it("looks templates up by id", () => {
    expect(templateById("villa")?.name).toBe("Villa");
    expect(templateById("nope")).toBeNull();
  });
});
