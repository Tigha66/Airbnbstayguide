import { describe, expect, it } from "vitest";
import { demoAnswer, demoProperties, conciergeSystemPrompt } from "@stayguide/shared";
import { detectLanguage } from "./language";
import { parseManual } from "./guide-parser";
import { retrieve } from "./retrieval";
import { keywordAnswer, unknownAnswer } from "./concierge";

describe("detectLanguage", () => {
  const cases: [string, string | null][] = [
    ["Quel est le mot de passe du wifi ?", "fr"],
    ["À quelle heure est le départ ?", "fr"],
    ["Où est-ce que je peux me garer ?", "fr"],
    ["c'est quoi le code de la boîte à clés", "fr"],
    ["¿Dónde puedo aparcar?", "es"],
    ["Cual es la contraseña del wifi", "es"],
    ["Wo kann ich parken?", "de"],
    ["Wie ist das WLAN Passwort?", "de"],
    ["Dove posso parcheggiare?", "it"],
    ["Qual è la password del wifi?", "it"],
    ["Onde posso estacionar?", "pt"],
    ["Qual é a senha do wifi?", "pt"],
    ["Waar kan ik parkeren?", "nl"],
    ["What is the wifi password?", "en"],
    ["Where can I park?", "en"],
    ["ما هي كلمة سر الواي فاي", "ar"],
    ["WiFiのパスワードは？", "ja"],
    ["无线网密码是什么", "zh"],
    ["와이파이 비밀번호", "ko"],
    ["वाईफाई पासवर्ड क्या है", "hi"],
  ];
  it.each(cases)("%s → %s", (question, expected) => {
    expect(detectLanguage(question)).toBe(expected);
  });
  it("returns null when the language is unclear, so the selected language is used", () => {
    expect(detectLanguage("wifi")).toBeNull();
    expect(detectLanguage("checkout?")).toBeNull();
    expect(detectLanguage("")).toBeNull();
  });
});

describe("answers in the guest's language", () => {
  const manual = `ARRIVAL: The lockbox code is 4821.
WI-FI: Network "SeaView_Guest", password "sunset2026".
PARKING: Free street parking on Rua das Flores.
TRASH: Bins are at the corner.
CHECKOUT: Checkout is by 11:00 AM.`;
  const sections = parseManual(manual);

  it("escalation message is translated for every supported language", () => {
    expect(unknownAnswer("fr").answer).toMatch(/hôte/);
    expect(unknownAnswer("de").answer).toMatch(/Gastgeber/);
    expect(unknownAnswer("ja").answer).not.toBe(unknownAnswer("en").answer);
    expect(unknownAnswer("xx").answer).toBe(unknownAnswer("en").answer);
    expect(unknownAnswer("fr").escalate).toBe(true);
  });

  it("fallback search understands common non-English questions", () => {
    expect(retrieve(sections, "Quel est le mot de passe du wifi ?", 1)[0]?.type).toBe("wifi");
    expect(retrieve(sections, "Où puis-je me garer ?", 1)[0]?.type).toBe("parking");
    expect(retrieve(sections, "À quelle heure est le départ ?", 1)[0]?.type).toBe("checkout");
    expect(retrieve(sections, "Où sont les poubelles ?", 1)[0]?.type).toBe("trash");
    expect(retrieve(sections, "¿Dónde puedo aparcar?", 1)[0]?.type).toBe("parking");
    expect(retrieve(sections, "Wie ist das WLAN Passwort?", 1)[0]?.type).toBe("wifi");
    const property = { ...demoProperties[0], sections };
    expect(keywordAnswer(property, "Quel est le code de la boîte à clés ?", "fr").answer).toContain("4821");
  });

  it("AI prompt tells the model to follow the question's language", () => {
    const prompt = conciergeSystemPrompt("## Wi-Fi\npassword sunset2026", "English");
    expect(prompt).toMatch(/same language as the guest's question/);
    expect(prompt).toMatch(/reply in English/);
  });

  it("sample guides find the right section for French questions", () => {
    const property = demoProperties[0];
    const wifi = property.sections.find((s) => s.id === "wifi");
    if (wifi) expect(demoAnswer(property, "Quel est le mot de passe du wifi ?").answer).toBe(demoAnswer(property, "wifi password").answer);
    expect(demoAnswer(property, "Je voudrais un petit déjeuner").citations).not.toContain("House rules");
  });
});
