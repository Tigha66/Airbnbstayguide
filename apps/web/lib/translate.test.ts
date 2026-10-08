import { describe, expect, it, vi, beforeEach } from "vitest";
import { applyGuideText, demoAnswer, demoProperties } from "@stayguide/shared";
import { guestText, guestUiLanguages, isRtl, fill } from "./guest-i18n";

vi.mock("./ai", () => ({ generateJson: vi.fn() }));
import { generateJson } from "./ai";
import { guideHash, guideLanguage, guideText, keepsProtected, protectedTokens, translateGuide } from "./translate";
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
