export const supportEmail = "hello@getstayguide.com";

// The earlier Vercel Production setup used RESENDAPIKEY (no underscores).
// Keep both names supported without altering existing secret values.
// Prefer the canonical RESEND_API_KEY when both are present.
function resendApiKey() {
  return process.env.RESEND_API_KEY || process.env.RESENDAPIKEY;
}

export function mailerConfigured() {
  return Boolean(resendApiKey() && (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM));
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const key = resendApiKey();
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
  if (!key || !from) throw new Error("Email is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    throw new Error("Email provider rejected delivery (" + res.status + ")");
  }
}
