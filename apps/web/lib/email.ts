/**
 * Transactional email through Resend's HTTP API (no SDK needed).
 * Env: RESEND_API_KEY and EMAIL_FROM (e.g. "StayGuide <notifications@getstayguide.com>", on a domain
 * verified in Resend). Without them every send is a logged no-op; nothing here ever throws.
 */

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://www.getstayguide.com").replace(/\/$/, "");

export type Email = { to: string; subject: string; text: string; html: string; replyTo?: string };

export const looksLikeEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());

/** Sends one email. Returns true when Resend accepted it; false (and logs) otherwise. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailConfigured()) {
    console.info("[email] not configured; skipped:", email.subject);
    return false;
  }
  if (!looksLikeEmail(email.to)) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email.to.trim()],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(email.replyTo && looksLikeEmail(email.replyTo) ? { reply_to: email.replyTo.trim() } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error("[email] Resend refused", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return res.ok;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain, readable layout: guest-supplied text is always escaped. */
function layout(title: string, paragraphs: string[], button: { label: string; url: string }, footer: string) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.5">${p}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f8f9f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:28px 22px">
<div style="font-weight:800;font-size:20px;margin-bottom:18px">stayguide<span style="color:#0f766e">.</span></div>
<h1 style="font-size:20px;margin:0 0 14px">${escape(title)}</h1>${body}
<p style="margin:22px 0"><a href="${escape(button.url)}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block">${escape(button.label)}</a></p>
<p style="color:#666;font-size:12px;line-height:1.5;margin-top:28px">${footer}</p></div></body></html>`;
}

const hostFooter = (settingsUrl: string) =>
  `You're receiving this because email notifications are on for your StayGuide account. <a href="${escape(settingsUrl)}" style="color:#0f766e">Turn them off in Settings</a>.`;

export function escalationEmail(input: { to: string; hostName?: string | null; propertyName: string; question: string; language: string }): Email {
  const inbox = `${siteUrl()}/dashboard/inbox`;
  const settings = `${siteUrl()}/dashboard/settings`;
  const subject = `A guest at ${input.propertyName} needs your help`;
  const greeting = input.hostName ? `Hi ${input.hostName.split(" ")[0]},` : "Hi,";
  const quoted = input.question.length > 600 ? `${input.question.slice(0, 600)}…` : input.question;
  return {
    to: input.to,
    subject,
    text: `${greeting}\n\nA guest at ${input.propertyName} asked something the guide doesn't answer:\n\n"${quoted}"\n\nReply in your inbox and they'll see it in their guide: ${inbox}\n\nTurn these emails off in Settings: ${settings}`,
    html: layout(
      subject,
      [
        escape(greeting),
        `A guest at <strong>${escape(input.propertyName)}</strong> asked something the guide doesn't answer:`,
        `<span style="display:block;border-left:3px solid #0f766e;padding:6px 12px;background:#fff">${escape(quoted)}</span>`,
        `Reply in your inbox and they'll see it in their guide${input.language !== "en" ? ` (they wrote in ${escape(input.language.toUpperCase())}; replies are shown as you write them)` : ""}.`,
      ],
      { label: "Reply in your inbox", url: inbox },
      hostFooter(settings),
    ),
  };
}

export function extraRequestEmail(input: {
  to: string;
  hostName?: string | null;
  propertyName: string;
  extraName: string;
  guestName: string;
  guestContact: string;
  note: string;
  paidOnline: boolean;
}): Email {
  const extras = `${siteUrl()}/dashboard/extras`;
  const settings = `${siteUrl()}/dashboard/settings`;
  const subject = `${input.extraName} requested at ${input.propertyName}`;
  const greeting = input.hostName ? `Hi ${input.hostName.split(" ")[0]},` : "Hi,";
  const how = input.paidOnline ? "The guest is paying online; approve or decline it in your dashboard." : "Confirm with the guest how they'll pay, then approve or decline it in your dashboard.";
  return {
    to: input.to,
    subject,
    replyTo: looksLikeEmail(input.guestContact) ? input.guestContact : undefined,
    text: `${greeting}\n\n${input.guestName} requested "${input.extraName}" at ${input.propertyName}.\nContact: ${input.guestContact}${input.note ? `\nNote: ${input.note}` : ""}\n\n${how}\n${extras}\n\nTurn these emails off in Settings: ${settings}`,
    html: layout(
      subject,
      [
        escape(greeting),
        `<strong>${escape(input.guestName)}</strong> requested <strong>${escape(input.extraName)}</strong> at ${escape(input.propertyName)}.`,
        `Contact: ${escape(input.guestContact)}${input.note ? `<br>Note: ${escape(input.note)}` : ""}`,
        escape(how),
      ],
      { label: "Open your extras", url: extras },
      hostFooter(settings),
    ),
  };
}

export function extraDecisionEmail(input: { to: string; guestName: string; propertyName: string; extraName: string; approved: boolean; guideUrl: string }): Email {
  const subject = input.approved
    ? `Your ${input.extraName} at ${input.propertyName} is confirmed`
    : `Your ${input.extraName} request at ${input.propertyName}`;
  const line = input.approved
    ? `Good news: your host confirmed your request for ${input.extraName}.`
    : `Unfortunately your host can't offer ${input.extraName} this time. If you paid online, the payment hold has been released.`;
  return {
    to: input.to,
    subject,
    text: `Hi ${input.guestName},\n\n${line}\n\nYour guide: ${input.guideUrl}`,
    html: layout(subject, [escape(`Hi ${input.guestName},`), escape(line)], { label: "Open your guide", url: input.guideUrl }, "Sent by StayGuide on behalf of your host."),
  };
}
