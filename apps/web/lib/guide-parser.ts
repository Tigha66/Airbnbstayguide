import type { Section } from "@stayguide/shared";
const kinds: [RegExp, string, string, string][] = [
  [/arriv|check.?in|access|entry|door|key/i, "arrival", "A lovely arrival", "key"],
  [/wi.?fi|internet|network/i, "wifi", "Wi-Fi", "wifi"],
  [/rule/i, "rules", "House rules", "heart"],
  [/applian|kitchen|coffee|washing|heating|air.?con|tv/i, "appliances", "Appliances", "coffee"],
  [/park|car/i, "parking", "Parking", "car"],
  [/trash|rubbish|garbage|recycl|bin/i, "trash", "Trash & recycling", "leaf"],
  [/check.?out|departure|leaving/i, "checkout", "Checkout", "sun"],
  [/emergenc|safety|first.?aid|fire|hospital/i, "emergency", "Emergency", "shield"],
  [/local|tip|restaurant|food|beach|explore|recommend/i, "local", "Local tips", "map"],
];
function classify(label: string) {
  // Checkout must win over the generic check-in/arrival pattern.
  if (/check.?out/i.test(label)) return kinds[6];
  return kinds.find(([re]) => re.test(label));
}
/**
 * Turns a pasted house manual into guide sections without AI.
 * Recognises "LABEL:" lines and markdown headings; unlabelled text becomes a welcome section.
 */
export function parseManual(text: string): Section[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: { label: string; body: string[] }[] = [];
  let current: { label: string; body: string[] } = { label: "", body: [] };
  for (const line of lines) {
    const heading =
      line.match(/^\s*#{1,4}\s+(.+?)\s*$/) ||
      line.match(/^\s*([A-Z][A-Za-z0-9 &/'-]{1,40}?)\s*:\s*(.*)$/);
    if (heading && (line.trim().startsWith("#") || /^[A-Z]/.test(heading[1]) && heading[1].length <= 40 && (heading[1] === heading[1].toUpperCase() || classify(heading[1])))) {
      if (current.label || current.body.join("").trim()) blocks.push(current);
      current = { label: heading[1].trim(), body: heading[2] ? [heading[2]] : [] };
    } else current.body.push(line);
  }
  if (current.label || current.body.join("").trim()) blocks.push(current);
  const sections: Section[] = [];
  const used = new Map<string, number>();
  for (const block of blocks) {
    const body = block.body.join("\n").trim();
    if (!body) continue;
    const kind = block.label ? classify(block.label) : undefined;
    const type = kind?.[1] ?? (block.label ? "custom" : "welcome");
    const n = (used.get(type) ?? 0) + 1;
    used.set(type, n);
    const existing = sections.find((s) => s.type === type && type !== "custom");
    if (existing) {
      existing.body += `\n\n${body}`;
      continue;
    }
    sections.push({
      id: n > 1 ? `${type}-${n}` : type === "custom" ? `custom-${sections.length + 1}` : type,
      type,
      title: kind?.[2] ?? (block.label ? titleCase(block.label) : "Welcome"),
      body,
      icon: kind?.[3] ?? "book",
    });
  }
  return sections;
}
function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
/** Best-effort extraction of Wi-Fi details so the guest "tap to copy" card works. */
export function extractWifi(text: string) {
  const network =
    text.match(/network(?:\s+name)?\s*(?:is|:)?\s*["“]([^"”]+)["”]/i)?.[1] ??
    text.match(/(?:ssid|network(?:\s+name)?)\s*[:=]\s*([^\s,.;]+)/i)?.[1] ??
    "";
  const password =
    text.match(/password\s*(?:is|:)?\s*["“]([^"”]+)["”]/i)?.[1] ??
    text.match(/password\s*[:=]\s*([^\s,;]+)/i)?.[1]?.replace(/\.$/, "") ??
    "";
  return { network, password };
}
export function extractTime(text: string, kind: "in" | "out") {
  const re =
    kind === "in"
      ? /check.?in[^0-9]{0,20}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
      : /check.?out[^0-9]{0,20}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
  return text.match(re)?.[1]?.trim().toUpperCase() ?? "";
}
