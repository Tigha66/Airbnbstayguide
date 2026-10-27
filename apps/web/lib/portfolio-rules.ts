/** Preview and execution use the same literal, case-insensitive matching. */
export function matchPortfolioRule<T extends { keyword: string; priority: "normal" | "urgent"; enabled?: boolean }>(rules: T[], message: string): T | null {
  const text = message.toLowerCase();
  return [...rules]
    .filter(rule => rule.enabled !== false)
    .sort((a, b) => Number(b.priority === "urgent") - Number(a.priority === "urgent"))
    .find(rule => text.includes(rule.keyword.toLowerCase())) ?? null;
}
