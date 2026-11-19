"use client";

import { useRef, useState } from "react";
import { guideWhatsAppMessage, normaliseWhatsAppNumber } from "@/lib/whatsapp";

export function WhatsAppGuideShare({ id, name, slug, published }: { id: string; name: string; slug: string; published: boolean }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const inFlight = useRef(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const message = guideWhatsAppMessage(name, `${origin}/g/${slug}`);
  async function send() {
    if (inFlight.current || attempted) return;
    inFlight.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/v1/properties/${encodeURIComponent(id)}/whatsapp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, consent }),
      });
      const result = await response.json();
      setFeedback(result.message || result.error || "Check WhatsApp before sending again.");
      setAttempted(response.ok || response.status === 409);
    } catch {
      setAttempted(true);
      setFeedback("Delivery is unconfirmed. Check WhatsApp before sending again.");
    } finally { setBusy(false); inFlight.current = false; }
  }
  return (
    <div className="card panel">
      <h3>Send guide by WhatsApp</h3>
      <label>Guest phone number
        <input type="tel" autoComplete="off" placeholder="+44 7901 921642" value={phone} disabled={busy || attempted} onChange={(event) => setPhone(event.target.value)} />
      </label>
      <p style={{ whiteSpace: "pre-wrap", margin: "16px 0" }}>{message}</p>
      <label className="row">
        <input type="checkbox" checked={consent} disabled={busy || attempted} onChange={(event) => setConsent(event.target.checked)} />
        The guest has agreed to receive this guide by WhatsApp.
      </label>
      {!published && <p>Publish this guide before sending it.</p>}
      <button type="button" className="button secondary small" style={{ marginTop: 15 }} disabled={!published || !normaliseWhatsAppNumber(phone) || !consent || busy || attempted} onClick={send}>
        {busy ? "Sending…" : "Send via OpenWA"}
      </button>
      {feedback && <p role="status" style={{ marginTop: 12 }}>{feedback}</p>}
      {attempted && <button type="button" className="button secondary small" onClick={() => { setPhone(""); setConsent(false); setAttempted(false); setFeedback(""); }}>Send to another guest</button>}
    </div>
  );
}
