import { languages } from "@stayguide/shared";

export type Language = (typeof languages)[number];

// Short, distinctive function words per language. A question is attributed to the
// language with the most hits; ties or no hits mean "unknown" (the caller then
// falls back to the guest's selected language).
const words: Partial<Record<Language, string[]>> = {
  en: ["the", "is", "are", "what", "where", "how", "when", "can", "could", "do", "does", "my", "you", "your", "there", "please", "time", "and", "of", "it", "which", "we", "thanks", "hello", "hi"],
  fr: ["le", "les", "est", "quel", "quelle", "quels", "quelles", "où", "comment", "quand", "je", "nous", "vous", "mon", "ma", "mes", "du", "des", "une", "pour", "avec", "il", "y", "peut", "peux", "puis", "heure", "merci", "bonjour", "svp", "c'est", "qu'est", "est-ce", "au", "aux", "sont", "faut", "dois"],
  es: ["el", "los", "las", "es", "qué", "dónde", "donde", "cómo", "cuándo", "cuando", "puedo", "hay", "para", "con", "una", "del", "por", "favor", "hola", "gracias", "hora", "está", "estacionar", "aparcar", "mi", "tengo"],
  de: ["der", "die", "das", "ist", "wie", "wo", "wann", "ich", "wir", "mein", "meine", "sie", "gibt", "es", "und", "kann", "können", "bitte", "danke", "ein", "eine", "um", "uhr", "hallo", "wo", "welche", "parken"],
  it: ["il", "lo", "gli", "è", "qual", "quale", "dove", "come", "quando", "c'è", "ci", "per", "una", "della", "dello", "grazie", "ciao", "ora", "che", "sono", "parcheggiare", "posso"],
  pt: ["os", "é", "qual", "onde", "como", "quando", "posso", "meu", "minha", "tem", "há", "para", "com", "uma", "um", "do", "da", "obrigado", "obrigada", "olá", "hora", "estacionar", "senha", "você"],
  nl: ["de", "het", "is", "wat", "waar", "hoe", "wanneer", "ik", "mijn", "er", "kan", "voor", "met", "een", "bedankt", "hallo", "laat", "parkeren", "wachtwoord", "mag", "jullie"],
};

// Characters that strongly suggest one language.
const marks: [Language, RegExp][] = [
  ["es", /[ñ¿¡]/],
  ["pt", /[ãõ]/],
  ["de", /[ßäöü]/],
  ["fr", /[çèêëîïœ]|\b(?:qu|l|d|j|n|s|c)'/],
  ["it", /\b(?:c|l|un|dell)'[aeiouè]|(?:^|\s)è(?:\s|$)/],
];

/** Best-effort language of a guest's message, or null when it isn't clear (e.g. "wifi?"). */
export function detectLanguage(text: string): Language | null {
  const t = text.trim();
  if (!t) return null;
  // Non-Latin scripts are unambiguous.
  if (/[぀-ヿ]/.test(t)) return "ja";
  if (/[가-힯ᄀ-ᇿ]/.test(t)) return "ko";
  if (/[一-鿿]/.test(t)) return "zh";
  if (/[؀-ۿ]/.test(t)) return "ar";
  if (/[ऀ-ॿ]/.test(t)) return "hi";

  const lower = t.toLowerCase().replace(/[’`]/g, "'");
  const tokens = lower.split(/[^\p{L}'-]+/u).filter(Boolean);
  const scores = new Map<Language, number>();
  for (const [lang, list] of Object.entries(words) as [Language, string[]][]) {
    const set = new Set(list);
    let score = 0;
    for (const tok of tokens) if (set.has(tok)) score += 1;
    scores.set(lang, score);
  }
  for (const [lang, re] of marks) if (re.test(lower)) scores.set(lang, (scores.get(lang) ?? 0) + 2);

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (!best || best[1] === 0 || (second && second[1] === best[1])) return null;
  return best[0];
}
