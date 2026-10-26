import { z } from "zod";
import type { GuideText, Property } from "@stayguide/shared";

// Some private browsers, embedded webviews and full devices reject storage.
// Saving a preference must never prevent a guest reading or asking a question.
export function readGuestSetting(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writeGuestSetting(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Continue without persistence. */ }
}

const textSchema = z.object({
  description: z.string(),
  sections: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })),
  extras: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
});

/** Compare the exact source, including edited access codes, before using a translation. */
export function translationSource(property: Property): string {
  return JSON.stringify({
    description: property.description,
    sections: property.sections.map(({ id, title, body }) => ({ id, title, body })),
    extras: property.extras.map(({ id, name, description }) => ({ id, name, description })),
  });
}
export function readGuestTranslation(key: string, source: string): GuideText | null {
  try {
    const cached = JSON.parse(readGuestSetting(key) ?? "null");
    if (cached?.source !== source) return null;
    const parsed = textSchema.safeParse(cached.text);
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
export function writeGuestTranslation(key: string, source: string, text: GuideText): void {
  writeGuestSetting(key, JSON.stringify({ source, text }));
}
