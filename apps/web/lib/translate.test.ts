import { describe, expect, it, vi, beforeEach } from "vitest";
import { applyGuideText, demoAnswer, demoProperties, languages } from "@stayguide/shared";
import { guestText, guestUiLanguages, isRtl, fill } from "./guest-i18n";

vi.mock("./ai", () => ({ generateJson: vi.fn() }));
import { generateJson } from "./ai";
import { guideHash, guideLanguage, guideText, keepsProtected, protectedTokens, translateGuide } from "./translate";
const mockedAi = vi.mocked(generateJson);

describe("guest interface translations", () => {
  it("has every text in all 12 guide languages", () => {
    expect(guestUiLanguages).toEqual(["en", "fr", "es", "de", "ar", "it", "pt", "nl", "ja", "zh", "ko", "hi"]);
    expect([...guestUiLanguages].sort()).toEqual([...languages].sort());
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
    expect(guestText("sv")).toBe(guestText("en"));
    expect(guestText("ja").navStay).toBe("ご滞在");
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
    expect(keepsProtected(src, "الرمز هو ٤٨٢١")).toBe(false); // the checkout time was dropped
  });
  it("normalises digit styles and time formats, but not codes or different times", () => {
    expect(keepsProtected("Code 4821, checkout 11:00 AM.", "الرمز ٤٨٢١، المغادرة ١١:٠٠ صباحًا.")).toBe(true);
    expect(keepsProtected("Check-in from 3:00 PM.", "チェックインは午後3時から。")).toBe(true);
    expect(keepsProtected("Check-in from 3:00 PM.", "Arrivée dès 15h00.")).toBe(true);
    expect(keepsProtected("Check-in from 3:00 PM.", "체크인은 오후 3시부터.")).toBe(true);
    expect(keepsProtected("Check-in from 3:00 PM.", "Check-in ab 14:00 Uhr.")).toBe(false);
    expect(keepsProtected("Late checkout €3.50 an hour.", "Départ tardif 3,50 € de l’heure.")).toBe(true);
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
  it("accepts the same time in local format, retries a wrong time strictly, and reports partial results", async () => {
    const { translateGuideWithStatus } = await import("./translate");
    const timed = { ...guideText(property), sections: [{ id: "arrival", title: "Arrival", body: "Check-in is from 3:00 PM." }] };
    const extrasOk = { description: "キャビンへようこそ。", extras: [{ id: "late", name: "レイトチェックアウト", description: "午後2時に出発。" }] };
    // 3:00 PM written as 午後3時 is the same time: accepted on the first try.
    mockedAi.mockImplementation(async (...args: unknown[]) => (JSON.parse(String(args[1])).body ? { title: "到着", body: "チェックインは午後3時からです。" } : extrasOk));
    const ok = await translateGuideWithStatus(timed, "ja");
    expect(ok.text.sections[0].body).toBe("チェックインは午後3時からです。");
    expect(ok.complete).toBe(true);
    // A different time (午後4時) is rejected, retried strictly, then accepted when it's right.
    mockedAi.mockImplementation(async (...args: unknown[]) => {
      if (!JSON.parse(String(args[1])).body) return extrasOk;
      return String(args[0]).includes("MUST appear unchanged") ? { title: "到着", body: "チェックインは15:00からです。" } : { title: "到着", body: "チェックインは午後4時からです。" };
    });
    expect((await translateGuideWithStatus(timed, "ja")).text.sections[0].body).toBe("チェックインは15:00からです。");
    // Wrong both times: the original is kept and the result is partial (so it isn't cached).
    mockedAi.mockImplementation(async (...args: unknown[]) => (JSON.parse(String(args[1])).body ? { title: "到着", body: "チェックインは午後4時からです。" } : extrasOk));
    const partial = await translateGuideWithStatus(timed, "ja");
    expect(partial.text.sections[0].body).toBe("Check-in is from 3:00 PM.");
    expect(partial.complete).toBe(false);
  });
  it("retries when the answer comes back in the wrong language", async () => {
    const { translateGuideWithStatus } = await import("./translate");
    const text = { ...guideText(property), sections: [{ id: "parking", title: "Parking", body: "You can park on the street in front of the house, and there is a free car park nearby." }] };
    let calls = 0;
    mockedAi.mockImplementation(async (...args: unknown[]) => {
      if (!JSON.parse(String(args[1])).body) return { description: "Bienvenue au chalet.", extras: [{ id: "late", name: "Départ tardif", description: "Partez à 2 PM." }] };
      calls++;
      return calls === 1
        ? { title: "Parking", body: "You can park on the street in front of the house, and there is a free car park nearby." }
        : { title: "Stationnement", body: "Vous pouvez vous garer dans la rue devant la maison, et il y a un parking gratuit à proximité." };
    });
    const out = await translateGuideWithStatus(text, "fr");
    expect(calls).toBe(2);
    expect(out.text.sections[0].title).toBe("Stationnement");
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
    for (const lang of guestUiLanguages)
      for (const q of guestText(lang).suggestions) expect(demoAnswer(p, q, lang).escalate, `${lang}: ${q}`).toBe(false);
  });
  it("replies in the guest's language when the sample guide has no answer", () => {
    expect(demoAnswer(p, "زرافة", "ar").answer).toContain("هذه المعلومة غير موجودة");
    expect(demoAnswer(p, "girafe", "fr").answer).toContain("Je n’ai pas cette information");
  });
});
