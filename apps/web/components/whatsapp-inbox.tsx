"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLocale } from "./app-locale";

type Message = {
  id: string;
  role: string;
  body: string;
  status: string;
  created_at: string;
  unread: boolean;
};
type Data = {
  draftsEnabled?: boolean;
  synthetic?: boolean;
  testPropertyId?: string | null;
  thread: { id: string; name: string; active: boolean; propertyId: string } | null;
  messages?: Message[];
};
const labels = {
  en: [
    "WhatsApp inbox",
    "Unread",
    "Mark as read",
    "Suggest reply",
    "Send reply",
    "Guest",
    "You",
    "Consent required",
    "Check the conversation before trying again.",
    "Draft reply",
  ],
  ar: [
    "صندوق واتساب",
    "غير مقروءة",
    "تحديد كمقروءة",
    "اقتراح رد",
    "إرسال الرد",
    "الضيف",
    "أنت",
    "يلزم موافقة الضيف",
    "تحقق من المحادثة قبل المحاولة مجدداً.",
    "مسودة الرد",
  ],
  fr: [
    "Boîte WhatsApp",
    "Non lu",
    "Marquer comme lu",
    "Suggérer une réponse",
    "Envoyer",
    "Voyageur",
    "Vous",
    "Consentement requis",
    "Vérifiez la conversation avant de réessayer.",
    "Brouillon",
  ],
  es: [
    "Bandeja de WhatsApp",
    "Sin leer",
    "Marcar como leído",
    "Sugerir respuesta",
    "Enviar",
    "Huésped",
    "Tú",
    "Se requiere consentimiento",
    "Comprueba la conversación antes de reintentar.",
    "Borrador",
  ],
  de: [
    "WhatsApp-Postfach",
    "Ungelesen",
    "Als gelesen markieren",
    "Antwort vorschlagen",
    "Senden",
    "Gast",
    "Sie",
    "Einwilligung erforderlich",
    "Vor einem neuen Versuch den Verlauf prüfen.",
    "Antwortentwurf",
  ],
};
export function WhatsAppInbox() {
  const { locale } = useAppLocale();
  const l = labels[locale as keyof typeof labels] || labels.en;
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [qaMessage, setQaMessage] = useState("");
  const lock = useRef(false);
  const key = useRef("");
  const reloadSequence = useRef(0);
  const url = "/api/v1/whatsapp/inbox";
  const reload = useCallback(async () => {
    const sequence = ++reloadSequence.current;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return;
      const next = await r.json() as Data;
      if (sequence === reloadSequence.current) setData(next);
    } catch {
      // Keep the last confirmed inbox state during transient network failures.
    }
  }, []);
  async function runSynthetic(action: "simulate" | "expire" | "renew" | "stop" | "cleanup") {
    const propertyId = data?.thread?.propertyId ?? data?.testPropertyId;
    if (!propertyId || busy) return;
    setBusy(true);
    setError(false);
    setQaMessage("");
    try {
      const response = await fetch("/api/v1/whatsapp/qa-synthetic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, propertyId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error();
      if (action === "simulate")
        setQaMessage("Synthetic checks passed: JOIN, signature rejection, duplicate filtering and consent expiry. No WhatsApp message was sent.");
      else if (action === "expire") setQaMessage("Synthetic consent expired. Dashboard replies are disabled.");
      else if (action === "renew") setQaMessage("Synthetic consent renewed for the reply test.");
      else if (action === "stop") setQaMessage("Synthetic STOP accepted. Consent is disabled.");
      else setQaMessage("Synthetic QA property and conversation cleaned up.");
      await reload();
    } catch {
      setError(true);
      setQaMessage("Synthetic QA action failed. No live WhatsApp message was sent.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const first = setTimeout(reload, 0);
    const timer = setInterval(reload, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [reload]);
  if (!data?.thread) {
    if (!data?.synthetic) return null;
    return (
      <section className="card panel" aria-label="WhatsApp inbox QA synthetic mode">
        <h2>{l[0]} · QA synthetic mode</h2>
        <p>No WhatsApp conversation exists yet. The normal guest inbox being empty is expected.</p>
        <p role="status">Synthetic transport is isolated to this Preview. It cannot send or receive a real WhatsApp message.</p>
        {data.testPropertyId ? (
          <button disabled={busy} onClick={() => runSynthetic("simulate")}>
            {busy ? "Running synthetic checks…" : "Create synthetic WhatsApp conversation"}
          </button>
        ) : <p>Publish the QA test guide first.</p>}
        {qaMessage && <p role="status">{qaMessage}</p>}
        {error && <p role="alert">Check the QA test configuration and try again.</p>}
      </section>
    );
  }
  const thread = data.thread;
  async function act(action: string, message?: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      if (!key.current) key.current = crypto.randomUUID();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          id: thread.id,
          key: key.current,
          text: draft,
          message,
        }),
      });
      if (!res.ok) throw Error();
      if (action === "suggest") {
        setDraft((await res.json()).reply);
        key.current = "";
      }
      if (action === "reply") {
        setDraft("");
        key.current = "";
      }
      await reload();
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card panel" dir={locale === "ar" ? "rtl" : "ltr"}>
      <h2>
        {l[0]} · {thread.name}
      </h2>
      {data.synthetic && <p role="status">QA synthetic transport is active. Replies are recorded in this Preview only; nothing is sent to WhatsApp.</p>}
      {qaMessage && <p role="status">{qaMessage}</p>}
      {error && <p role="alert">{l[8]}</p>}
      {data.messages?.map((m) => (
        <article
          key={m.id}
          style={{ padding: "8px 0", overflowWrap: "anywhere" }}
        >
          <small>
            {m.role === "guest" ? l[5] : l[6]} ·{" "}
            {new Date(m.created_at).toLocaleString(locale)} · {m.status}
          </small>
          <p dir="auto" style={{ whiteSpace: "pre-wrap" }}>
            {m.body}
          </p>
          {m.unread && (
            <button disabled={busy} onClick={() => act("read", m.id)}>
              {l[1]} · {l[2]}
            </button>
          )}
        </article>
      ))}
      {thread.active ? (
        <>
          <textarea
            aria-label={l[9]}
            placeholder={l[9]}
            disabled={busy}
            maxLength={2000}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              key.current = "";
            }}
            style={{ width: "100%" }}
          />
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {data.draftsEnabled && (
              <button disabled={busy} onClick={() => act("suggest")}>
                {l[3]}
              </button>
            )}
            <button
              disabled={busy || !draft.trim()}
              onClick={() => act("reply")}
            >
              {l[4]}
            </button>
          </div>
        </>
      ) : (
        <p>{l[7]}</p>
      )}
      {data.synthetic && <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {thread.active ? <button disabled={busy} onClick={() => runSynthetic("expire")}>Expire synthetic consent</button> : <button disabled={busy} onClick={() => runSynthetic("renew")}>Renew synthetic consent</button>}
        {thread.active && <button disabled={busy} onClick={() => runSynthetic("stop")}>Simulate STOP</button>}
        <button disabled={busy} onClick={() => runSynthetic("cleanup")}>Clean up QA test data</button>
      </div>}
      {error && <p role="alert">{l[8]}</p>}
    </section>
  );
}
