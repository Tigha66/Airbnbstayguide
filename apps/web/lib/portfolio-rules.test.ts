import { describe, expect, it } from "vitest";
import { matchPortfolioRule } from "./portfolio-rules";
describe("portfolio rule preview", () => {
  it("shares literal, case-insensitive matching with urgent precedence", () => {
    const rules = [
      { keyword: "water", priority: "normal" as const, enabled: true },
      { keyword: "leak", priority: "urgent" as const, enabled: true },
    ];
    expect(matchPortfolioRule(rules, "WATER LEAK")).toEqual(rules[1]);
    expect(matchPortfolioRule([{ ...rules[1], enabled: false }], "leak")).toBeNull();
    expect(matchPortfolioRule([{ keyword: "a.b", priority: "normal" }], "aXb")).toBeNull();
  });
});
