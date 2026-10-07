import type { Section } from "@stayguide/shared";
const stop = new Set(
  [
    "a an the is are was be to of and or in on at for with how what where when do does can i my we our you your it this that there please",
    // Common French, Spanish, German, Italian, Portuguese and Dutch function words (accents are stripped by tokens()).
    "le la les un une des du de est et ou ou quel quelle quels comment quand je nous vous mon ma mes il elle y pour avec dans sur au aux ce cette qu que peut peux puis svp merci bonjour",
    "el los las es y que donde como cuando puedo mi tu hay para con en por favor hola gracias",
    "der die das ist und wie wo wann ich wir mein sie es gibt kann bitte danke ein eine im",
    "il lo gli e che dove come quando posso mio ci per con della grazie",
    "o os as qual onde quando meu minha tem ha com uma um do da obrigado",
    "het wat waar hoe wanneer ik mijn er kan voor met een",
  ]
    .join(" ")
    .split(" "),
);
const synonyms: Record<string, string[]> = {
  wifi: ["wifi", "internet", "network", "password"],
  internet: ["wifi", "internet", "network"],
  checkout: ["checkout", "leave", "departure"],
  checkin: ["checkin", "arrival", "key", "access"],
  leave: ["checkout", "leave"],
  park: ["parking", "car", "garage"],
  car: ["parking", "car"],
  trash: ["trash", "rubbish", "garbage", "bin", "recycling"],
  key: ["key", "door", "code", "lockbox", "arrival", "access"],
  door: ["door", "key", "code", "arrival"],
  coffee: ["coffee", "nespresso", "machine", "appliances"],
  emergency: ["emergency", "112", "911", "doctor", "hospital", "fire"],
  eat: ["restaurant", "food", "breakfast", "lunch", "dinner", "cafe", "local"],
};
// Words guests use in other languages, mapped onto the English vocabulary above (accents stripped).
const translated: Record<string, string> = {
  // Wi-Fi / internet
  passe: "wifi", motdepasse: "wifi", reseau: "wifi", contrasena: "wifi", clave: "wifi", passwort: "wifi", wlan: "wifi", senha: "wifi", wachtwoord: "wifi", rete: "wifi",
  // Checkout
  depart: "checkout", partir: "checkout", salida: "checkout", abreise: "checkout", partenza: "checkout", saida: "checkout", vertrek: "checkout", uitchecken: "checkout",
  // Arrival / keys / door
  arrivee: "key", cle: "key", cles: "key", porte: "door", boite: "key", llave: "key", llaves: "key", puerta: "door", llegada: "key", schlussel: "key", tur: "door", ankunft: "key",
  chiave: "key", chiavi: "key", porta: "door", arrivo: "key", chave: "key", chegada: "key", sleutel: "key", deur: "door", aankomst: "key", code: "key", codigo: "key", codice: "key",
  // Parking
  garer: "park", stationnement: "park", voiture: "car", aparcar: "park", estacionar: "park", estacionamiento: "park", coche: "car", parken: "park", parkplatz: "park", auto: "car",
  parcheggio: "park", parcheggiare: "park", carro: "car", parkeren: "park",
  // Trash
  poubelle: "trash", poubelles: "trash", dechet: "trash", dechets: "trash", basura: "trash", mull: "trash", spazzatura: "trash", rifiuti: "trash", lixo: "trash", afval: "trash",
  // Coffee / appliances
  cafe: "coffee", cafetiere: "coffee", kaffee: "coffee", caffe: "coffee", koffie: "coffee",
  // Emergency
  urgence: "emergency", medecin: "emergency", hopital: "emergency", urgencia: "emergency", notfall: "emergency", emergenza: "emergency", emergencia: "emergency", noodgeval: "emergency",
  // Food
  manger: "eat", restaurants: "eat", comer: "eat", essen: "eat", mangiare: "eat", eten: "eat",
};
export function tokens(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // drop accents ("départ" → "depart") instead of splitting the word
    .replace(/check[\s-]?(in|out)\b/g, "check$1") // "check-out" / "check out" → "checkout"
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    // Light stemming, only when a real stem remains ("parking" → "park", but "bring" stays "bring").
    .map((t) => t.replace(/(ing|ed|es|s)$/, (m, _g, _i, s) => (s.length - m.length >= 4 ? "" : m)))
    .filter((t) => t.length > 1 && !stop.has(t));
}
// The dictionary keyed by the same normalised form tokens() produces (e.g. "poubelles" → "poubell").
let translatedCache: Map<string, string> | null = null;
function translatedTokens() {
  translatedCache ??= new Map(
    Object.entries(translated).flatMap(([word, meaning]) => [
      [word, meaning] as [string, string],
      ...tokens(word).map((t) => [t, meaning] as [string, string]),
    ]),
  );
  return translatedCache;
}
/** Ranks guide sections by keyword overlap with the question (title matches weigh more). */
export function retrieve(sections: Section[], question: string, limit = 4) {
  // Keep the guest's own word, add its synonyms, and normalise them the same way as guide text
  // (so "parking" in a synonym list matches "parking" in a guide, which tokenises to "park").
  const q = tokens(question)
    .flatMap((t) => {
      const meaning = translatedTokens().get(t);
      return meaning ? [t, meaning] : [t];
    })
    .flatMap((t) => [t, ...(synonyms[t] ?? [])])
    .flatMap((w) => tokens(w));
  const scored = sections.map((s) => {
    const title = new Set(tokens(`${s.title} ${s.type}`));
    const body = tokens(s.body);
    let score = 0;
    for (const t of new Set(q)) {
      if (title.has(t)) score += 3;
      // Prefix matches ("park" → "parking") only for real words, so "br" can't match "Breeze".
      score += Math.min(body.filter((b) => b === t || (t.length >= 4 && b.startsWith(t))).length, 3);
    }
    return { s, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.s);
}
/** Small guides are sent whole; large guides send the best-matching sections. */
export function guideContext(sections: Section[], question: string, budget = 12000) {
  const full = sections.map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
  if (full.length <= budget) return { context: full, used: sections };
  const used = retrieve(sections, question, 6);
  return { context: used.map((s) => `## ${s.title}\n${s.body}`).join("\n\n").slice(0, budget), used };
}
