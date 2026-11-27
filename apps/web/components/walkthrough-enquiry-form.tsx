"use client";

import { useState } from "react";

export function WalkthroughEnquiryForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: HTMLFormElement) {
    setBusy(true); setStatus("");
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/walkthrough", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send enquiry.");
      form.reset(); setStatus("Thanks. Your enquiry has been received.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send enquiry.");
    } finally { setBusy(false); }
  }
  return (
    <form className="walkthrough-form" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
      <label>Name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
      <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>Property name<input name="propertyName" required minLength={2} maxLength={120} /></label>
      <label>Property URL<input name="propertyUrl" type="url" required maxLength={2048} placeholder="https://…" /></label>
      <label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <button className="button" disabled={busy}>{busy ? "Sending…" : "Request a walkthrough"}</button>
      <p role="status" aria-live="polite">{status}</p>
    </form>
  );
}
