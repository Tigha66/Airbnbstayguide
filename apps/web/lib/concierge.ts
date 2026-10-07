import { z } from "zod";
import type { Property } from "@stayguide/shared";
import { conciergeSystemPrompt } from "@stayguide/shared";
import { generateJson } from "./ai";
import { guideContext, retrieve } from "./retrieval";
export type ConciergeAnswer = { answer: string; citations: string[]; escalate: boolean };
const languageNames: Record<string, string> = { en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese", nl: "Dutch", ar: "Arabic", ja: "Japanese", zh: "Chinese", ko: "Korean", hi: "Hindi" };
// Shown when the guide doesn't cover a question; the conversation is escalated to the host.
const unknownText: Record<string, string> = {
  en: "I don’t have that information in this guide, so I’ve passed your question to your host. They’ll reply here soon.",
  fr: "Je n’ai pas cette information dans le guide. J’ai transmis votre question à votre hôte, qui vous répondra ici très vite.",
  es: "No tengo esa información en la guía. He enviado tu pregunta a tu anfitrión, que te responderá aquí pronto.",
  de: "Diese Information steht nicht im Gästeleitfaden. Ich habe Ihre Frage an Ihren Gastgeber weitergeleitet, der Ihnen hier bald antwortet.",
  it: "Non ho questa informazione nella guida. Ho inoltrato la tua domanda al tuo host, che ti risponderà qui a breve.",
  pt: "Não tenho essa informação no guia. Enviei a sua pergunta ao seu anfitrião, que responderá aqui em breve.",
  nl: "Die informatie staat niet in de gids. Ik heb je vraag doorgestuurd naar je host, die hier snel zal antwoorden.",
  ar: "لا تتوفر هذه المعلومة في الدليل، لذلك أرسلت سؤالك إلى مضيفك وسيرد عليك هنا قريبًا.",
  ja: "その情報はガイドに記載されていないため、ホストに質問を転送しました。まもなくこちらで返信があります。",
  zh: "指南中没有这方面的信息，我已将您的问题转给房东，房东会很快在这里回复您。",
  ko: "가이드에 해당 정보가 없어 호스트에게 질문을 전달했습니다. 곧 여기에서 답변을 받으실 수 있습니다.",
  hi: "यह जानकारी गाइड में नहीं है, इसलिए मैंने आपका प्रश्न आपके होस्ट को भेज दिया है। वे जल्द ही यहाँ जवाब देंगे।",
};
export const unknownAnswer = (language: string): ConciergeAnswer => ({
  answer: unknownText[language] ?? unknownText.en,
  citations: [],
  escalate: true,
});
function guideFor(property: Property) {
  const facts = [
    `## Stay details\nCheck-in: ${property.checkIn}\nCheckout: ${property.checkOut}${property.wifi ? `\nWi-Fi network: ${property.wifi}` : ""}${property.wifiPassword ? `\nWi-Fi password: ${property.wifiPassword}` : ""}${property.hostPhone ? `\nHost phone: ${property.hostPhone}` : ""}`,
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
