export function guideWhatsAppMessage(name: string, url: string) {
  return `We’re looking forward to welcoming you to ${name}! Here’s your guest guide with arrival instructions and everything you need for your stay: ${url}\nSafe travels!`;
}

export function normaliseWhatsAppNumber(input: string) {
  const number = input.trim().replace(/[\s()+-]/g, "").replace(/^00/, "");
  return /^[1-9]\d{7,14}$/.test(number) ? number : null;
}

/** A guest initiates the conversation in WhatsApp; no OpenWA credentials reach the browser. */
export function guestWhatsAppLink(phone: string, propertyName: string, messageTemplate: string): string | null {
  const number = normaliseWhatsAppNumber(phone);
  if (!number) return null;
  const text = messageTemplate.replace("{name}", propertyName);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
