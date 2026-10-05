import type { Section } from "@stayguide/shared";
const stop = new Set("a an the is are was be to of and or in on at for with how what where when do does can i my we our you your it this that there please".split(" "));
const synonyms: Record<string, string[]> = {
  wifi: ["wifi", "internet", "network", "password"],
  internet: ["wifi", "internet", "network"],
  checkout: ["checkout", "leave", "departure"],
  leave: ["checkout", "leave"],
  park: ["parking", "car", "garage"],
  car: ["parking", "car"],
  trash: ["trash", "rubbish", "garbage", "bin", "recycling"],
  key: ["key", "door", "code", "lockbox", "arrival", "access"],
  door: ["door", "key", "code", "arrival"],
  coffee: ["coffee", "nespresso", "machine", "appliances"],
  emergency: ["emergency", "112", "911", "doctor", "hospital", "fire"],
  eat: ["restaurant", "food", "breakfast", "lunch", "dinner", "cafe", "local"],
};
export function tokens(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/(ing|ed|es|s)$/, (m, _g, i, s) => (s.length > 4 ? "" : m)))
    .filter((t) => t.length > 1 && !stop.has(t));
}
/** Ranks guide sections by keyword overlap with the question (title matches weigh more). */
export function retrieve(sections: Section[], question: string, limit = 4) {
  const q = tokens(question).flatMap((t) => synonyms[t] ?? [t]);
  const scored = sections.map((s) => {
    const title = new Set(tokens(`${s.title} ${s.type}`));
    const body = tokens(s.body);
    let score = 0;
    for (const t of new Set(q)) {
      if (title.has(t)) score += 3;
      score += Math.min(body.filter((b) => b === t || b.startsWith(t)).length, 3);
    }
    return { s, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.s);
}
/** Small guides are sent whole; large guides send the best-matching sections. */
export function guideContext(sections: Section[], question: string, budget = 12000) {
  const full = sections.map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
  if (full.length <= budget) return { context: full, used: sections };
  const used = retrieve(sections, question, 6);
  return { context: used.map((s) => `## ${s.title}\n${s.body}`).join("\n\n").slice(0, budget), used };
}
