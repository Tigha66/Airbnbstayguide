import { describe, it, expect } from "vitest";
import {
  priceFor,
  applicationFee,
  conciergeSystemPrompt,
  demoAnswer,
  demoProperties,
  chatSchema,
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
    expect(prompt).toContain("Reply in fr");
  });
});
