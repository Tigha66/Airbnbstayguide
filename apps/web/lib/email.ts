import { appUrl } from "./stripe";
import { captureError } from "./monitoring";

type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export async function sendEmail(email: Email) {
  if (!emailConfigured()) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html ?? `<pre>${escapeHtml(email.text)}</pre>`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}`);
    return true;
  } catch (error) {
    await captureError(error, { area: "email", subject: email.subject });
    return false;
  }
}

export async function notifyHostEscalation(input: {
  hostEmail: string;
  propertyName: string;
  threadId: string;
  question: string;
  language: string;
}) {
  const dashboardUrl = `${appUrl()}/dashboard/inbox`;
  return sendEmail({
    to: input.hostEmail,
    subject: `Guest question for ${input.propertyName}`,
    text: [
      `A guest asked a question that StayGuide escalated to you.`,
      ``,
      `Property: ${input.propertyName}`,
      `Language: ${input.language}`,
      `Thread: ${input.threadId}`,
      ``,
      input.question,
      ``,
      `Reply in your StayGuide inbox: ${dashboardUrl}`,
    ].join("\n"),
  });
}

export async function notifyHostExtraRequest(input: {
  hostEmail: string;
  propertyName: string;
  extraName: string;
  guestName: string;
  guestContact: string;
  note: string;
  status: string;
}) {
  const dashboardUrl = `${appUrl()}/dashboard/extras`;
  return sendEmail({
    to: input.hostEmail,
    subject: `New extra request: ${input.extraName}`,
    text: [
      `A guest requested an extra in StayGuide.`,
      ``,
      `Property: ${input.propertyName}`,
      `Extra: ${input.extraName}`,
      `Guest: ${input.guestName}`,
      `Contact: ${input.guestContact}`,
      `Status: ${input.status}`,
      input.note ? `Note: ${input.note}` : "",
      ``,
      `Review it here: ${dashboardUrl}`,
    ].filter(Boolean).join("\n"),
  });
}

