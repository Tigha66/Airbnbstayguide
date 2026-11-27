export type WalkthroughEnquiry = { name: string; email: string; propertyName: string; propertyUrl: string; company: string };

export function validateWalkthroughEnquiry(value: unknown): WalkthroughEnquiry | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const email = typeof item.email === "string" ? item.email.trim().toLowerCase() : "";
  const propertyName = typeof item.propertyName === "string" ? item.propertyName.trim() : "";
  const propertyUrl = typeof item.propertyUrl === "string" ? item.propertyUrl.trim() : "";
  const company = typeof item.company === "string" ? item.company.trim() : "";
  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  if (propertyName.length < 2 || propertyName.length > 120 || propertyUrl.length > 2048 || company.length > 200) return null;
  try { const url = new URL(propertyUrl); if (url.protocol !== "https:" || !url.hostname.includes(".")) return null; }
  catch { return null; }
  return { name, email, propertyName, propertyUrl, company };
}
