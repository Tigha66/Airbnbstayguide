import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { applyGuideText, demoAnswer, demoProperties } from "@stayguide/shared";
import { guestText, guestUiLanguages, isRtl, fill } from "./guest-i18n";

vi.mock("./ai", () => ({ generateJson: vi.fn() }));
import { generateJson } from "./ai";
import { completeGuideTranslation, guideHash, guideLanguage, guideText, keepsProtected, protectedTokens, translateGuide } from "./translate";
const mockedAi = vi.mocked(generateJson);

describe("guest interface translations", () => {
  it("has every text in English, French, Spanish, German and Arabic", () => {
    expect(guestUiLanguages).toEqual(["en", "fr", "es", "de", "ar"]);
    const keys = Object.keys(guestText("en")).sort();
    for (const lang of guestUiLanguages) {
      const t = guestText(lang);
      expect(Object.keys(t).sort()).toEqual(keys);
      for (const [k, v] of Object.entries(t)) {
        if (Array.isArray(v)) expect(v).toHaveLength(3);
        else expect(v, `${lang}.${k}`).not.toBe("");
      }
    }
    expect(guestText("fr").welcome).toBe("Bienvenue, faites comme chez vous.");
    expect(guestText("ar").navStay).toBe("إقامتك");
  });
  it("falls back to English for other languages and marks Arabic as right-to-left", () => {
    expect(guestText("it")).toBe(guestText("en"));
    expect(guestText("de").welcome).toBe("Willkommen, fühlen Sie sich wie zu Hause.");
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("fr")).toBe(false);
    expect(fill(guestText("fr").wifiCopied, { network: "SeaView" })).toBe("SeaView · Mot de passe copié");
  });
});

describe("guide translation safety", () => {
  it("does not accept incomplete or tampered legacy cached translations", () => {
    const original = guideText(demoProperties[0]);
    const keepTokens = (text: string) => protectedTokens(text).join(" ");
    // This is structurally French and retains original sensitive tokens;
    // a few prefixed French words alongside unchanged English are NOT
    // a fully translated guide and should never be marked complete.
    const translations = {
      description: "Bienvenue dans votre hébergement, nous sommes ravis de vous accueillir à Lisbonne.",
      sections: original.sections.map(section => ({
        id: section.id,
        title: "Informations pratiques pour votre séjour " + keepTokens(section.title),
        body: "Bienvenue dans votre logement. Pour votre séjour, voici les informations importantes et les détails de votre arrivée. " +
          "Merci de consulter le guide pour connaître les instructions et les horaires. " + keepTokens(section.body),
      })),
      extras: original.extras.map(extra => ({
        id: extra.id,
        name: "Service pratique pour votre séjour " + keepTokens(extra.name),
        description: "Profitez de votre séjour et réservez votre service à la réception. " + keepTokens(extra.description),
      })),
    };
    expect(completeGuideTranslation(original, translations, "fr")).toBe(true);
    const partial = { ...translations, sections: translations.sections.map((section, i) => i === 1 ? original.sections[i] : section) };
    expect(completeGuideTranslation(original, partial, "fr")).toBe(false);
    const wrongCode = { ...translations, sections: translations.sections.map((section, i) => i === 0 ? { ...section, body: "Code remplacé." } : section) };
    expect(completeGuideTranslation(original, wrongCode, "fr")).toBe(false);
    expect(completeGuideTranslation(original, translations, "de")).toBe(false);
  });
  it("finds codes, passwords, times, networks, emails and links that must not change", () => {
    const tokens = protectedTokens('Lockbox code 4821. Wi-Fi "SmokyRidge_Guest", password bearden2026. Check-in 4:00 PM. Mail hi@x.com or see https://x.com/a.');
    expect(tokens).toEqual(expect.arrayContaining(["4821", "SmokyRidge_Guest", "bearden2026", "4", "00", "hi@x.com", "https://x.com/a"]));
  });
  it("rejects a translation that changes or drops a code", () => {
    const src = "The lockbox code is 4821 and checkout is 11:00 AM.";
    expect(keepsProtected(src, "Le code de la boîte à clés est 4821 et le départ est à 11:00 AM.")).toBe(true);
    expect(keepsProtected(src, "Le code est 4812 et le départ est à 11:00.")).toBe(false);
    expect(keepsProtected(src, "الرمز هو ٤٨٢١")).toBe(false); // Arabic-Indic digits are not accepted
  });
});

describe("translateGuide", () => {
  const property = {
    ...demoProperties[0],
    description: "Welcome to the cabin.",
    sections: [
      { id: "arrival", type: "arrival", title: "Arrival", body: "The lockbox code is 4821.", icon: "key" },
      { id: "wifi", type: "wifi", title: "Wi-Fi", body: "Network SmokyRidge_Guest, password bearden2026.", icon: "wifi" },
    ],
    extras: [{ id: "late", name: "Late checkout", description: "Leave at 2 PM.", price: 3500, icon: "clock", approval: true }],
  };
  beforeEach(() => {
    mockedAi.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("runs section batches and extras with a dedicated model without changing codes", async () => {
    vi.stubEnv("AI_TRANSLATION_MODEL", "sensenova-6.8-flash-lite");
    mockedAi.mockImplementation(async (...args: unknown[]) => {
      const input = JSON.parse(String(args[1]));
      if (input.sections) return {
        sections: input.sections.map((s: { id: string; title: string; body: string }) => ({
          id: s.id,
          title: s.id === "arrival" ? "Arrivée" : "Wi-Fi",
          body: s.id === "arrival" ? "Le code de la boîte à clés est 4821." : "Réseau SmokyRidge_Guest, mot de passe bearden2026.",
        })),
      };
      return { description: "Bienvenue au chalet.", extras: [{ id: "late", name: "Départ tardif", description: "Partez à 2 PM." }] };
    });
    const result = await translateGuide(guideText(property), "fr");
    expect(mockedAi).toHaveBeenCalledTimes(3);
    expect(mockedAi.mock.calls.every((call) => call[4] === "sensenova-6.8-flash-lite")).toBe(true);
    expect(result.sections.map((s) => s.title)).toEqual(["Arrivée", "Wi-Fi"]);
    expect(result.sections[0].body).toContain("4821");
    expect(result.sections[1].body).toContain("bearden2026");
    expect(result.description).toBe("Bienvenue au chalet.");
  });

  it("resumes a partial guide without retranslating already completed parts", async () => {
    vi.stubEnv("AI_TRANSLATION_MODEL", "sensenova-6.8-flash-lite");
    const original = guideText(property);
    mockedAi.mockImplementation(async (...args: unknown[]) => {
      const input = JSON.parse(String(args[1]));
      if (input.sections) return { sections: input.sections.map((section: { id: string; title: string; body: string }) =>
        section.id === "arrival"
          ? { id: section.id, title: "Arrivée", body: "Le code de la boîte à clés est 4821." }
          : section,
      ) };
      if (input.description) return { description: "Bienvenue au chalet." };
      return { extras: [{ id: "late", name: "Départ tardif", description: "Partez à 2 PM." }] };
    });
    const partial = await translateGuide(original, "fr");
    expect(partial.sections[0].title).toBe("Arrivée");
    expect(partial.sections[1].body).toBe(original.sections[1].body);
    expect(mockedAi).toHaveBeenCalledTimes(3);

    mockedAi.mockReset();
    mockedAi.mockImplementation(async (...args: unknown[]) => {
      const input = JSON.parse(String(args[1]));
      expect(input.sections?.map((s: { id: string }) => s.id)).toEqual(["wifi"]);
      return { sections: [{ id: "wifi", title: "Wi-Fi", body: "Réseau SmokyRidge_Guest, mot de passe bearden2026." }] };
    });
    const result = await translateGuide(original, "fr", partial);
    expect(mockedAi).toHaveBeenCalledTimes(1);
    expect(result.sections[0].title).toBe("Arrivée");
    expect(result.sections[1].body).toContain("Réseau");
    expect(result.description).toBe("Bienvenue au chalet.");
    expect(result.extras[0].name).toBe("Départ tardif");
  });

  it("keeps the original guide if every dedicated-model call times out", async () => {
    vi.stubEnv("AI_TRANSLATION_MODEL", "sensenova-6.8-flash-lite");
    mockedAi.mockRejectedValue(new Error("HCN timeout"));
    const original = guideText(property);
    const out = await translateGuide(original, "de");
    expect(out).toEqual(original);
    expect(mockedAi).toHaveBeenCalledTimes(3);
  });

  it("translates sections, welcome text and extras", async () => {
    mockedAi.mockImplementation(async (...args: unknown[]) => {
      const input = JSON.parse(String(args[1]));
      if (input.body?.includes("4821")) return { title: "Arrivée", body: "Le code de la boîte à clés est 4821." };
      if (input.body) return { title: "Wi-Fi", body: "Réseau SmokyRidge_Guest, mot de passe bearden2026." };
      return { description: "Bienvenue au chalet.", extras: [{ id: "late", name: "Départ tardif", description: "Partez à 2 PM." }] };
    });
    const out = await translateGuide(guideText(property), "fr");
    expect(out.sections.map((s) => s.title)).toEqual(["Arrivée", "Wi-Fi"]);
    expect(out.description).toBe("Bienvenue au chalet.");
    expect(out.extras[0]).toEqual({ id: "late", name: "Départ tardif", description: "Partez à 2 PM." });
    const applied = applyGuideText(property, out);
    expect(applied.sections[0].body).toContain("4821");
    expect(applied.extras[0].price).toBe(3500); // prices and other fields are never translated
  });
  it("keeps the original when the AI changes a code or fails", async () => {
    mockedAi.mockImplementation(async (...args: unknown[]) => {
      const input = JSON.parse(String(args[1]));
      if (input.body?.includes("4821")) return { title: "Arrivée", body: "Le code est 4812." }; // wrong code
      if (input.body) throw new Error("AI timeout");
      return { description: "Bienvenue.", extras: [] };
    });
    const out = await translateGuide(guideText(property), "fr");
    expect(out.sections[0].body).toBe("The lockbox code is 4821.");
    expect(out.sections[1].body).toBe("Network SmokyRidge_Guest, password bearden2026.");
    expect(out.extras[0].name).toBe("Late checkout");
  });
  it("detects the guide's language and changes the cache key when the host edits", () => {
    const text = guideText(property);
    expect(guideLanguage({ ...text, sections: [{ id: "a", title: "Arrival", body: "Where is the key? The code is in the box and you can park on the street." }] })).toBe("en");
    expect(guideHash(text)).not.toBe(guideHash({ ...text, description: "Changed" }));
  });
});

describe("sample guide answers", () => {
  const p = demoProperties[0];
  it("understands the translated suggestion questions", () => {
    for (const lang of ["en", "fr", "es", "de", "ar"])
      for (const q of guestText(lang).suggestions) expect(demoAnswer(p, q, lang).escalate, `${lang}: ${q}`).toBe(false);
  });
  it("replies in the guest's language when the sample guide has no answer", () => {
    expect(demoAnswer(p, "زرافة", "ar").answer).toContain("هذه المعلومة غير موجودة");
    expect(demoAnswer(p, "girafe", "fr").answer).toContain("Je n’ai pas cette information");
  });
});
