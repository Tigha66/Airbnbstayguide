"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Message = { id: string; body: string; status: string; scheduledAt: string; timeZone: string; contentHash: string; lastError: string | null };
type Connection = { id: string; provider: string; status: string; paused: boolean };
type Outbox = { messages: Message[]; connections: Connection[]; deliveryAvailable: boolean; setupRequired: string; scheduler?: { status: string; lastStartedAt: string; lastSuccessAt: string | null } | null };

export function PmsOutbox() {
  const [data, setData] = useState<Outbox | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/manager/outbox", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load PMS delivery queue");
      setData(result); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "PMS queue unavailable"); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function action(body: object) {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const response = await fetch("/api/v1/manager/outbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update queue");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update queue"); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="card panel" style={{ marginBottom: 20 }} aria-label="PMS delivery queue">
    <h3>PMS delivery queue</h3>
    {error && <p role="alert">{error} <button className="button secondary small" onClick={() => void load()}>Retry queue</button></p>}
    {!data && !error && <p>Loading delivery status…</p>}
    {data && <>
      {!data.deliveryAvailable && <p className="notice">PMS delivery is not connected. {data.setupRequired}. Messages in this queue will not be sent.</p>}
      <p role="status">Scheduled worker: {data.scheduler ? data.scheduler.status.replaceAll("_", " ") : "not yet verified"}.
        {data.scheduler?.lastSuccessAt && <> Last successful run: {new Date(data.scheduler.lastSuccessAt).toLocaleString()}.</>}
      </p>
      {data.connections.length === 0 && <p>No PMS account connected. Guesty and Hospitable setup must be completed before importing reservations.</p>}
      {data.connections.map(c => <div className="activity-item" key={c.id} style={{ gap: 12, flexWrap: "wrap" }}>
        <span>{c.provider} · {c.status} · {c.paused ? "Paused" : "Active"}</span>
        <button className="button secondary small" disabled={busy} onClick={() => void action({ action: "pause", id: c.id, paused: !c.paused })}>{c.paused ? "Resume queue" : "Pause queue"}</button>
      </div>)}
      {data.messages.length === 0 && <p>No scheduled PMS messages.</p>}
      {data.messages.map(m => <article key={m.id} className="activity-item" style={{ display: "block", overflowWrap: "anywhere" }}>
        <strong>{m.status}</strong><p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
        <p>{new Date(m.scheduledAt).toLocaleString(undefined, { timeZone: m.timeZone })} ({m.timeZone})</p>
        {m.lastError && <p role="status">{m.status === "unknown" ? "Delivery outcome unknown. Check the PMS before sending another message." : m.lastError.replaceAll("_", " ")}</p>}
        {m.status === "draft" && <button className="button secondary small" disabled={busy || !data.deliveryAvailable} onClick={() => void action({ action: "approve", id: m.id, contentHash: m.contentHash })}>Approve this exact message</button>}
        {["draft", "approved", "failed"].includes(m.status) && <button className="button secondary small" disabled={busy} onClick={() => void action({ action: "cancel", id: m.id })}>Cancel message</button>}
      </article>)}
    </>}
  </section>;
}
