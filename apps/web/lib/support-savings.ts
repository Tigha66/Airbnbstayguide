/**
 * Scenario modelling only. This deliberately does not read guest conversations or
 * imply that a real property saved these hours.
 */
export type SupportSavingsAssumptions = {
  weeklyQuestions: number;
  minutesPerQuestion: number;
  reductionPercent: number;
  hourlyStaffCostGbp: number;
};

const bounded = (value: number, minimum: number, maximum: number) =>
  Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : minimum;

export function estimateSupportSavings(input: SupportSavingsAssumptions) {
  const weeklyQuestions = bounded(input.weeklyQuestions, 0, 10000);
  const minutes = bounded(input.minutesPerQuestion, 0, 120);
  const reductionPercent = bounded(input.reductionPercent, 0, 100);
  const hourlyCost = bounded(input.hourlyStaffCostGbp, 0, 1000);
  const avoidedQuestionsPerWeek = weeklyQuestions * reductionPercent / 100;
  const hoursPerMonth = (avoidedQuestionsPerWeek * minutes / 60) * (52 / 12);
  return {
    avoidedQuestionsPerWeek,
    hoursPerMonth,
    labourValueGbpPerMonth: hoursPerMonth * hourlyCost,
  };
}
