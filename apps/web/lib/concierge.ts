import { z } from "zod";
import type { Property } from "@stayguide/shared";
import { conciergeSystemPrompt } from "@stayguide/shared";
import { generateJson } from "./ai";
import { guideContext, retrieve } from "./retrieval";
export type ConciergeAnswer = { answer: string; citations: string[]; escalate: boolean };
const languageNames: Record<string, string> = { en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese", nl: "Dutch", ar: "Arabic", ja: "Japanese", zh: "Chinese", ko: "Korean", hi: "Hindi" };
export const unknownAnswer = (language: string): ConciergeAnswer => ({
  answer:
    language === "fr" ? "Je n’ai pas cette information dans le guide. J’ai transmis votre question à votre hôte."
    : language === "es" ? "No tengo esa información en la guía. He enviado tu pregunta a tu anfitrión."
    : "I don’t have that information in this guide, so I’ve passed your question to your host. They’ll reply here soon.",
  citations: [],
  escalate: true,
});
function guideFor(property: Property) {
  const facts = [
    `## Stay details\nCheck-in: ${property.checkIn}\nCheckout: ${property.checkOut}${property.wifi ? `\nWi-Fi network: ${property.wifi}` : ""}${property.wifiPassword ? `\nWi-Fi password: ${property.wifiPassword}` : property.wifiPrivate ? "\nWi-Fi password: shown in the guest's private stay link from the host (top of the guide)." : ""}${property.hostPhone ? `\nHost phone: ${property.hostPhone}` : ""}`,
  ];
  return { sections: property.sections, facts: facts.join("\n") };
}
/** Answers without AI by returning the best-matching guide section. */
export function keywordAnswer(property: Property, question: string, language: string): ConciergeAnswer {
  const [best] = retrieve(property.sections, question, 1);
  if (!best) return unknownAnswer(language);
  return { answer: best.body, citations: [best.title], escalate: false };
}
const schema = z.object({ answer: z.string().min(1), citations: z.array(z.string()).default([]), escalate: z.boolean().default(false) });
export async function aiAnswer(property: Property, question: string, language: string): Promise<ConciergeAnswer> {
  const { sections, facts } = guideFor(property);
  const { context } = guideContext(sections, question);
  const json = await generateJson(
    conciergeSystemPrompt(`${facts}\n\n${context}`, languageNames[language] ?? "English") +
      `\nValid citation titles: ${JSON.stringify(["Stay details", ...sections.map((s) => s.title)])}.\nRespond with JSON only, for example {"answer":"...","citations":["Checkout"],"escalate":false}.`,
    question,
    700,
  );
  const out = schema.parse(json);
  const valid = new Set(["Stay details", ...sections.map((s) => s.title)]);
  const citations = out.citations.filter((c) => valid.has(c));
  if (out.escalate || citations.length === 0) return { answer: out.escalate ? out.answer : unknownAnswer(language).answer, citations: [], escalate: true };
  return { answer: out.answer, citations, escalate: false };
}
