import { describe, expect, it } from "vitest";
import { estimateSupportSavings } from "./support-savings";

describe("illustrative support-savings model", () => {
  it("calculates weekly avoided questions and average monthly hours", () => {
    const result = estimateSupportSavings({
      weeklyQuestions: 20, minutesPerQuestion: 5,
      reductionPercent: 30, hourlyStaffCostGbp: 18,
    });
    expect(result.avoidedQuestionsPerWeek).toBe(6);
    expect(result.hoursPerMonth).toBeCloseTo(13 / 6, 5);
    expect(result.labourValueGbpPerMonth).toBeCloseTo(39, 5);
  });
  it("never attributes savings without an assumed reduction", () => {
    expect(estimateSupportSavings({
      weeklyQuestions: 100, minutesPerQuestion: 10,
      reductionPercent: 0, hourlyStaffCostGbp: 25,
    }).labourValueGbpPerMonth).toBe(0);
  });
  it("clamps invalid inputs and prevents nonfinite or negative output", () => {
    const result = estimateSupportSavings({
      weeklyQuestions: Number.POSITIVE_INFINITY,
      minutesPerQuestion: -4,
      reductionPercent: 250,
      hourlyStaffCostGbp: -2,
    });
    expect(result.hoursPerMonth).toBe(0);
    expect(result.labourValueGbpPerMonth).toBe(0);
    expect(Number.isFinite(result.avoidedQuestionsPerWeek)).toBe(true);
  });
});
