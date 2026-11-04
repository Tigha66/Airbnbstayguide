import type { GuestText } from "../guest-i18n";

/** Maintains complete 74-field guest UI dictionaries for each additional locale.
 * Rows intentionally map to the existing GuestText schema. Tests ensure every
 * field and substitution marker is present for every language.
 */
export const guestLocaleKeys = ["offline","notFoundTitle","notFoundBody","exploreSample","languageLabel","eyebrow","welcome","wifi","wifiTap","wifiAsk","wifiCopied","wifiShow","findWay","openMaps","needHand","hereForYou","demoConcierge","checkIn","checkOut","details","helpTitle","helpBody","meetConcierge","install","chatTitle","chatIntro","chatIntro2","demoNotice","chatWelcome","suggestions","fromGuide","fromHost","notified","outsideSample","thinking","askLabel","askPlaceholder","send","unavailable","chatOffline","extrasTitle","extrasBody1","extrasBody2","sampleExtras","request","requestExtra","treat","demoRequest","approval","noExtrasTitle","noExtrasBody","requestTitle","requestHelp","yourName","contact","note","notePlaceholder","continue","cancel","openingCheckout","requestSent","requestFailed","paid","paymentCancelled","footer","navStay","navConcierge","navExtras","navLabel","translated","showOriginal","showTranslation","translating","translationWarning"] as const satisfies readonly (keyof GuestText)[];

export function buildGuestLocale(language: string, rows: string): GuestText {
  const values = rows.trim().split("\n").map((value) => value.trim());
  if (values.length !== guestLocaleKeys.length) {
    throw new Error(`Incomplete ${language} guest UI dictionary: ${values.length}/${guestLocaleKeys.length}`);
  }
  const result = Object.fromEntries(guestLocaleKeys.map((key, index) => [key, values[index]])) as Record<string, string | string[]>;
  result.suggestions = String(result.suggestions).split("~");
  if ((result.suggestions as string[]).length !== 3) {
    throw new Error(`Invalid ${language} concierge suggestions`);
  }
  for (const key of guestLocaleKeys) {
    if (!result[key] || (typeof result[key] === "string" && !String(result[key]).trim())) {
      throw new Error(`Missing ${language} guest UI text: ${key}`);
    }
  }
  return result as GuestText;
}
