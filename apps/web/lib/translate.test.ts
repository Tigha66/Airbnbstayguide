import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { applyGuideText, demoAnswer, demoProperties } from "@stayguide/shared";
import { guestText, guestUiLanguages, isRtl, fill, isolateClockTimes } from "./guest-i18n";

vi.mock("./ai", () => ({ generateJson: vi.fn() }));
import { generateJson } from "./ai";
import { detectLanguage } from "./language";
import { guideHash, guideLanguage, guideText, isExpectedGuideLanguage, isTranslationComplete, keepsProtected, protectedTokens, splitGuideBody, translateGuide, translateGuideWelcome, translateGuideWithStatus } from "./translate";
const mockedAi = vi.mocked(generateJson);
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("guest interface translations", () => {
  it("has every text in all 12 guest UI languages", () => {
    expect(guestUiLanguages).toEqual(["en", "fr", "es", "de", "it", "pt", "nl", "ar", "ja", "zh", "ko", "hi"]);
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
    for (const lang of guestUiLanguages) {
      for (const field of ["chatIntro", "wifiCopied", "wifiShow"] as const) {
        const sourceMarkers = [...guestText("en")[field].matchAll(/\\{[^}]+\\}/g)].map(m => m[0]).sort();
        const translatedMarkers = [...guestText(lang)[field].matchAll(/\\{[^}]+\\}/g)].map(m => m[0]).sort();
        expect(translatedMarkers, `${lang}.${field} must preserve all placeholders`).toEqual(sourceMarkers);
      }
    }
  });
  it("preserves Arabic time display without changing stored guide data", () => {
    const original = "تسجيل الوصول: 3:00 PM، تسجيل المغادرة: 11:00 AM";
    const rendered = isolateClockTimes(original, true);
    expect(rendered).toContain(String.fromCharCode(0x2066) + "3:00 PM" + String.fromCharCode(0x2069));
    expect(rendered).toContain(String.fromCharCode(0x2066) + "11:00 AM" + String.fromCharCode(0x2069));
    expect(isolateClockTimes(original, false)).toBe(original);
  });
  it("localizes all supported languages and only falls back for unknown ones", () => {
    for (const lang of ["it", "pt", "nl", "ja", "zh", "ko", "hi"]) {
      expect(guestText(lang).welcome).not.toBe(guestText("en").welcome);
      expect(guestText(lang).navStay).not.toBe(guestText("en").navStay);
      expect(guestText(lang).requestHelp).not.toBe(guestText("en").requestHelp);
    }
    expect(guestText("xx")).toBe(guestText("en"));
    expect(guestText("de").welcome).toBe("Willkommen, fühlen Sie sich wie zu Hause.");
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("fr")).toBe(false);
    expect(fill(guestText("fr").wifiCopied, { network: "SeaView" })).toBe("SeaView · Mot de passe copié");
  });
});

describe("guide translation safety", () => {
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

  it("splits long Markdown at whitespace without changing codes, times or content", () => {
    const source = ("- Close the windows before leaving.\\n- Check-out at 11:00 AM.\\n").repeat(24)
      + "Wi-Fi password: DemoOnly2026, lockbox: 4821.";
    const parts = splitGuideBody(source, 240);
    expect(parts.length).toBeGreaterThan(3);
    expect(parts.join("")).toBe(source);
    expect(parts.every((part) => part.length <= 240)).toBe(true);
    expect(protectedTokens(parts.join(""))).toEqual(protectedTokens(source));
  });

describe("independent welcome translation", () => {
  const source = "Welcome to our apartment. Check-in is at 3:00 PM. Wi-Fi StayGuide_Guest_Test, password DemoOnly2026.";
  const translations = [
    ["fr", "Bienvenue dans notre appartement. L'arrivée est à 3:00 PM. Le réseau Wi-Fi est StayGuide_Guest_Test et son mot de passe est DemoOnly2026."],
    ["es", "Bienvenido a nuestro apartamento. La llegada es a las 3:00 PM. La red Wi-Fi es StayGuide_Guest_Test y la contraseña es DemoOnly2026."],
    ["de", "Willkommen in unserem Apartment. Der Check-in ist um 3:00 PM. Das WLAN-Netzwerk ist StayGuide_Guest_Test und das Passwort lautet DemoOnly2026."],
    ["ar", "مرحبًا بكم في شقتنا. موعد تسجيل الوصول 3:00 PM. شبكة الواي فاي هي StayGuide_Guest_Test وكلمة المرور هي DemoOnly2026."],
  ] as const;
  for (const [language, translated] of translations) {
    it(`translates only the welcome to ${language} while retaining access details`, async () => {
      mockedAi.mockReset();
      mockedAi.mockResolvedValueOnce({ description: translated });
      expect(await translateGuideWelcome(source, language)).toBe(translated);
      expect(mockedAi).toHaveBeenCalledTimes(1);
      expect(keepsProtected(source, translated)).toBe(true);
    });
  }
  it("rejects an altered password instead of displaying an unsafe welcome", async () => {
    mockedAi.mockReset();
    mockedAi.mockResolvedValueOnce({ description: translations[1][1].replace("DemoOnly2026", "Modified2026") });
    expect(await translateGuideWelcome(source, "es")).toBeNull();
  });
  it("rejects an unchanged English response", async () => {
    mockedAi.mockReset();
    mockedAi.mockResolvedValueOnce({ description: source });
    expect(await translateGuideWelcome(source, "ar")).toBeNull();
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
  it("translates a long guide using small HCN-compatible chunks", async () => {
    const source = {
      description: "",
      sections: [{
        id: "arrival", title: "Arrival and house instructions",
        body: "Please close the windows before departure.\\n".repeat(45) + "The door code is 4821.",
      }],
      extras: [],
    };
    mockedAi.mockImplementation(async (_system, prompt) => {
      const input = JSON.parse(String(prompt)) as { title?: string; body?: string };
      if (!input.body) throw new Error("Unexpected extras translation");
      return {
        title: "Llegada e instrucciones de la casa",
        body: "Por favor, cierre las ventanas antes de salir. "
          + (input.body.includes("4821") ? "El código de acceso es 4821." : ""),
      };
    });
    const translated = await translateGuideWithStatus(source, "es");
    expect(mockedAi.mock.calls.length).toBeGreaterThan(1);
    expect(translated.complete).toBe(true);
    expect(translated.failedParts).toBe(0);
    expect(translated.text.sections[0].body).toContain("4821");
    expect(translated.text.sections[0].body).toContain("Por favor");
    expect(translated.text.sections[0].title).toBe("Llegada e instrucciones de la casa");
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


  it("never accepts Spanish guide content as a complete French translation", async () => {
    const source = guideText(property);
    const spanish = {
      description: "Bienvenido a la cabaña. Aquí encontrarás todas las instrucciones para tu estancia.",
      sections: [
        { id: "arrival", title: "Llegada", body: "El código de la caja de llaves es 4821." },
        { id: "wifi", title: "Wi-Fi", body: "La red es SmokyRidge_Guest y la contraseña es bearden2026." },
      ],
      extras: [{ id: "late", name: "Salida tardía", description: "Puede salir a las 2 PM." }],
    };
    expect(isExpectedGuideLanguage(spanish, "fr")).toBe(false);
    expect(isTranslationComplete(source, spanish, "fr")).toBe(false);

    mockedAi.mockImplementation(async (...args: unknown[]) => {
      const input = JSON.parse(String(args[1]));
      if (input.body?.includes("4821")) return { title: spanish.sections[0].title, body: spanish.sections[0].body };
      if (input.body) return { title: spanish.sections[1].title, body: spanish.sections[1].body };
      return { description: spanish.description, extras: spanish.extras };
    });
    const result = await translateGuideWithStatus(source, "fr");
    expect(result.complete).toBe(false);
    expect(result.failedParts).toBeGreaterThan(0);
    expect(result.text).toEqual(source);
  });

  it("never calls Google when the configured HCN model fails", async () => {
    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    vi.stubEnv("AI_BASE_URL", "https://api.hcnsec.cn/v1");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "invalid-google-fallback");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    mockedAi.mockRejectedValue(Object.assign(new Error("HCN unavailable"), { statusCode: 401 }));

    const outcome = await translateGuideWithStatus(guideText(property), "fr");

    expect(outcome.complete).toBe(false);
    expect(outcome.failedParts).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports failures instead of caching an incomplete guide", async () => {
    mockedAi.mockRejectedValue(new Error("Provider unavailable"));
    const outcome = await translateGuideWithStatus(guideText(property), "es");
    expect(outcome.complete).toBe(false);
    expect(outcome.failedParts).toBeGreaterThan(0);
    expect(outcome.text.description).toBe("Welcome to the cabin.");
    expect(isTranslationComplete(guideText(property), outcome.text)).toBe(false);
  });
  it("rejects a cached guide whose prose heading remains untranslated", () => {
    const source = guideText(property);
    const longer = {
      ...source,
      sections: source.sections.map((part, i) => i === 0 ? { ...part, title: "A little house etiquette" } : part),
    };
    const translated = {
      ...longer,
      description: "Bienvenue au chalet.",
      sections: longer.sections.map((part, i) =>
        i === 0 ? { ...part, body: "Le code de la boîte à clés est 4821." }
          : { ...part, body: "Réseau SmokyRidge_Guest, mot de passe bearden2026." }),
      extras: [{ id: "late", name: "Départ tardif", description: "Partez à 2 PM." }],
    };
    expect(isTranslationComplete(longer, translated)).toBe(false);
  });
  it("rejects partial cached translations and accepts complete ones", () => {
    const source = guideText(property);
    const partial = { ...source, description: "Bienvenue au chalet." };
    expect(isTranslationComplete(source, partial)).toBe(false);
    const complete = {
      description: "Bienvenue au chalet.",
      sections: [
        { id: "arrival", title: "Arrivée", body: "Le code de la boîte à clés est 4821." },
        { id: "wifi", title: "Wi-Fi", body: "Réseau SmokyRidge_Guest, mot de passe bearden2026." },
      ],
      extras: [{ id: "late", name: "Départ tardif", description: "Partez à 2 PM." }],
    };
    expect(isTranslationComplete(source, complete)).toBe(true);
  });
  it("detects the guide's language and changes the cache key when the host edits", () => {
    const text = guideText(property);
    expect(guideLanguage({ ...text, sections: [{ id: "a", title: "Arrival", body: "Where is the key? The code is in the box and you can park on the street." }] })).toBe("en");
    expect(guideHash(text)).not.toBe(guideHash({ ...text, description: "Changed" }));
  });
});


describe("concierge language selection", () => {
  const examples = [
    ["en", "Where can we park?"],
    ["fr", "Où est le parking ?"],
    ["es", "¿Dónde está el aparcamiento?"],
    ["de", "Wo kann ich parken?"],
    ["it", "Dove posso parcheggiare?"],
    ["pt", "Onde posso estacionar?"],
    ["nl", "Waar kan ik parkeren?"],
    ["ar", "أين الموقف؟"],
    ["ja", "鍵はどこですか？"],
    ["zh", "无线网络密码是什么?"],
    ["ko", "와이파이 비밀번호가 뭐예요?"],
    ["hi", "वाईफ़ाई पासवर्ड क्या है?"],
  ] as const;
  for (const [language, question] of examples)
    it(`detects ${language} guest messages`, () => expect(detectLanguage(question)).toBe(language));
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
