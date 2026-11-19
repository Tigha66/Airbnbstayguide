export function guideWhatsAppMessage(name: string, url: string) {
  return `We’re looking forward to welcoming you to ${name}! Here’s your guest guide with arrival instructions and everything you need for your stay: ${url}\nSafe travels!`;
}

export function normaliseWhatsAppNumber(input: string) {
  const number = input.trim().replace(/[\s()+-]/g, "").replace(/^00/, "");
  return /^[1-9]\d{7,14}$/.test(number) ? number : null;
}
