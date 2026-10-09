import { z } from "zod";
import type { GuideText, Property } from "@stayguide/shared";
import { applyGuideText } from "@stayguide/shared";
import { conciergeSystemPrompt } from "@stayguide/shared";
import { generateJson } from "./ai";
import { guideContext, retrieve } from "./retrieval";
export const CONCIERGE_AI_TIMEOUT_MS = 12000;
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
// Sample guides have no real host: questions they don't cover get this fixed message instead.
const demoEscalationText: Record<string, string> = {
  en: "That isn’t covered in this sample guide. In a real StayGuide, your question would go straight to the host, who replies right here.",
  fr: "Ce n’est pas indiqué dans ce guide d’exemple. Dans un vrai StayGuide, votre question serait transmise directement à l’hôte, qui répond ici.",
  es: "Eso no aparece en esta guía de ejemplo. En un StayGuide real, tu pregunta llegaría directamente al anfitrión, que responde aquí mismo.",
  de: "Das steht nicht in diesem Beispielleitfaden. In einem echten StayGuide ginge Ihre Frage direkt an den Gastgeber, der Ihnen hier antwortet.",
  it: "Questo non è indicato in questa guida di esempio. In un vero StayGuide la tua domanda arriverebbe direttamente all’host, che risponde qui.",
  pt: "Isso não consta deste guia de exemplo. Num StayGuide real, a sua pergunta iria diretamente para o anfitrião, que responde aqui.",
  nl: "Dat staat niet in deze voorbeeldgids. In een echte StayGuide gaat je vraag direct naar de host, die hier antwoordt.",
  ar: "هذه المعلومة غير موجودة في هذا الدليل التجريبي. في StayGuide حقيقي، يصل سؤالك مباشرة إلى المضيف الذي يرد عليك هنا.",
  ja: "このサンプルガイドには記載がありません。実際のStayGuideでは、ご質問はそのままホストに届き、ここで返信されます。",
  zh: "这份示例指南中没有相关信息。在真实的 StayGuide 中，您的问题会直接发送给房东，房东会在这里回复。",
  ko: "이 샘플 가이드에는 해당 내용이 없습니다. 실제 StayGuide에서는 질문이 바로 호스트에게 전달되고, 호스트가 여기에서 답변합니다.",
  hi: "यह जानकारी इस नमूना गाइड में नहीं है। असली StayGuide में आपका प्रश्न सीधे होस्ट के पास जाता है, जो यहीं जवाब देते हैं।",
};
/** The fixed "Demo" hand-over for sample guides (no host is emailed, nothing is saved). */
export const demoEscalation = (language: string): ConciergeAnswer => ({
  answer: demoEscalationText[language] ?? demoEscalationText.en,
  citations: [],
  escalate: true,
});
export const unknownAnswer = (language: string): ConciergeAnswer => ({
  answer: unknownText[language] ?? unknownText.en,
  citations: [],
  escalate: true,
});
function guideFor(property: Property) {
  const facts = [
    `## Stay details${property.address ? `\nAddress: ${property.address}` : ""}\nTown: ${property.location}\nCheck-in: ${property.checkIn}\nCheckout: ${property.checkOut}${property.wifi ? `\nWi-Fi network: ${property.wifi}` : ""}${property.wifiPassword ? `\nWi-Fi password: ${property.wifiPassword}` : ""}${property.hostPhone ? `\nHost phone: ${property.hostPhone}` : ""}`,
  ];
  return { sections: property.sections, facts: facts.join("\n") };
}
/** Answers without AI by returning the best-matching guide section. */
// "What's the address?" in the supported Latin-script languages (accents stripped before matching).
const addressQuestion =
  /\b(address|located|where is the (house|property|cabin|apartment|home|place)|adresse|direccion|ubicacion|indirizzo|endereco|morada|adres|anschrift)\b/;
const addressLabel: Record<string, string> = { en: "The address is", fr: "L’adresse est", es: "La dirección es", de: "Die Adresse lautet", it: "L’indirizzo è", pt: "A morada é", nl: "Het adres is" };
/**
 * Keyword answer that prefers the guide's translation in the guest's language (when one is cached),
 * so a guest writing in French gets the French section and matches French words. Falls back to the
 * original guide.
 */
export function keywordAnswerTranslated(property: Property, translation: GuideText | null, question: string, language: string): ConciergeAnswer {
  if (translation) {
    const answer = keywordAnswer(applyGuideText(property, translation), question, language);
    if (!answer.escalate) return answer;
  }
  return keywordAnswer(property, question, language);
}
export function keywordAnswer(property: Property, question: string, language: string): ConciergeAnswer {
  const plain = question.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
  if (property.address?.trim() && addressQuestion.test(plain))
    return { answer: `${addressLabel[language] ?? addressLabel.en} ${property.address.trim()}.`, citations: ["Stay details"], escalate: false };
  const [best] = retrieve(property.sections, question, 1);
  if (!best) return unknownAnswer(language);
  return { answer: best.body, citations: [best.title], escalate: false };
}
const schema = z.object({ answer: z.string().min(1), citations: z.array(z.string()).default([]), escalate: z.boolean().default(false) });
export type ChatTurn = { role: string; content: string };

/**
 * The guest's message, preceded by the last few turns of the conversation so follow-ups
 * ("and the pool?", "what about Sunday?") are understood. Earlier turns are context only:
 * answers must still come from the guide.
 */
export function withHistory(question: string, history: ChatTurn[] = []) {
  const recent = history
    .filter((m) => m.role === "guest" || m.role === "assistant" || m.role === "host")
    .slice(-6)
    .map((m) => `${m.role === "guest" ? "Guest" : m.role === "host" ? "Host" : "Concierge"}: ${m.content.slice(0, 500)}`);
  return recent.length ? `Earlier in this conversation:\n${recent.join("\n")}\n\nGuest's new message: ${question}` : question;
}

export async function aiAnswer(property: Property, question: string, language: string, history: ChatTurn[] = []): Promise<ConciergeAnswer> {
  const { sections, facts } = guideFor(property);
  // Retrieve with the previous guest message too, so a short follow-up still finds the right section.
  const lastGuest = [...history].reverse().find((m) => m.role === "guest")?.content ?? "";
  const { context } = guideContext(sections, `${lastGuest} ${question}`.trim());
  const json = await generateJson(
    conciergeSystemPrompt(`${facts}\n\n${context}`, languageNames[language] ?? "English") +
      `\nValid citation titles: ${JSON.stringify(["Stay details", ...sections.map((s) => s.title)])}.\nRespond with JSON only, for example {"answer":"...","citations":["Checkout"],"escalate":false}.`,
    withHistory(question, history),
    700,
    // Guests are waiting: fall back to the keyword search rather than leave them hanging.
    CONCIERGE_AI_TIMEOUT_MS,
  );
  const out = schema.parse(json);
  const valid = new Set(["Stay details", ...sections.map((s) => s.title)]);
  const citations = out.citations.filter((c) => valid.has(c));
  if (out.escalate || citations.length === 0) return { answer: out.escalate ? out.answer : unknownAnswer(language).answer, citations: [], escalate: true };
  return { answer: out.answer, citations, escalate: false };
}
