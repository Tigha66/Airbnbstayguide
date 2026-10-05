"use client";
import { useCallback, useEffect, useState } from "react";
import { Send, Check, X, RefreshCw } from "lucide-react";
import { money } from "@stayguide/shared";
import { PageHeading } from "./ui";

type Thread = {
  threadId: string;
  propertyName: string;
  escalated: boolean;
  lastAt: string;
  messages: { role: string; content: string; createdAt: string }[];
};
type ExtraRequest = {
  id: string;
  propertyName: string;
  extraName: string;
  price: number;
  guestName: string;
  guestContact: string;
  note: string;
  status: string;
  createdAt: string;
};
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function usePoll<T>(url: string, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [url]);
  useEffect(() => {
    // Initial fetch, then poll so new guest messages appear without a refresh.
    const first = setTimeout(load, 0);
    const id = setInterval(load, ms);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load, ms]);
  return { data, error, reload: load };
}

export function LiveInbox({ notify }: { notify: (m: string) => void }) {
  const { data, error, reload } = usePoll<{ threads: Thread[] }>("/api/v1/inbox", 10000);
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [onlyEscalated, setOnlyEscalated] = useState(true);
  const threads = (data?.threads ?? []).filter((t) => !onlyEscalated || t.escalated);
  const thread = threads.find((t) => t.threadId === selected) ?? threads[0];
  return (
    <>
      <PageHeading title="A little human touch" description="Your concierge takes care of the everyday. You take care of the rest.">
        <label className="row" style={{ gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={onlyEscalated} onChange={(e) => setOnlyEscalated(e.target.checked)} />
          Needs your help only
        </label>
      </PageHeading>
      {error && <div className="notice">Couldn’t load conversations. Retrying…</div>}
      {!data && !error && <div className="card panel">Loading conversations…</div>}
      {data && threads.length === 0 && (
        <div className="card panel">
          <h3>All quiet for now</h3>
          <p>When a guest asks something your guide doesn’t answer, the conversation appears here so you can reply.</p>
        </div>
      )}
      {thread && (
        <div className="card inbox-grid">
          <div className="thread-list">
            {threads.map((t) => {
              const firstGuest = t.messages.find((m) => m.role === "guest");
              return (
                <button className={`thread-item ${thread.threadId === t.threadId ? "active" : ""}`} key={t.threadId} onClick={() => setSelected(t.threadId)}>
                  <div className="row">
                    <span className="avatar">G</span>
                    <strong>Guest</strong>
                  </div>
                  <span>{t.propertyName} · {when(t.lastAt)}</span>
                  <span>{firstGuest?.content}</span>
                  {t.escalated && <span className="pill amber" style={{ width: "fit-content" }}>Needs your help</span>}
                </button>
              );
            })}
          </div>
          <div className="chat-panel">
            <div className="row">
              <span className="avatar">G</span>
              <div>
                <h3>Guest</h3>
                <small>{thread.propertyName}</small>
              </div>
            </div>
            <div className="chat-messages">
              {thread.messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role === "host" ? "host" : ""}`} style={m.role === "assistant" ? { opacity: 0.75 } : undefined}>
                  <small style={{ display: "block", fontSize: 10, opacity: 0.7 }}>
                    {m.role === "guest" ? "Guest" : m.role === "host" ? "You" : "Concierge"} · {when(m.createdAt)}
                  </small>
                  {m.content}
                </div>
              ))}
            </div>
            <form
              className="chat-compose"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                const res = await fetch(`/api/v1/inbox/${thread.threadId}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: reply.trim() }),
                });
                if (res.ok) {
                  setReply("");
                  notify("Reply sent. The guest sees it in their guide chat.");
                  void reload();
                } else notify("Couldn’t send your reply. Please try again.");
              }}
            >
              <input aria-label="Reply to guest" placeholder="A thoughtful reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="button" aria-label="Send reply">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function LiveExtraRequests({ notify }: { notify: (m: string) => void }) {
  const { data, reload } = usePoll<{ requests: ExtraRequest[] }>("/api/v1/extra-requests", 20000);
  const act = async (id: string, status: "approved" | "declined" | "paid") => {
    const res = await fetch(`/api/v1/extra-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    notify(res.ok ? `Request ${status}. Let your guest know how to pay.` : "Couldn’t update the request.");
    void reload();
  };
  const requests = data?.requests ?? [];
  return (
    <div className="card panel" style={{ marginBottom: 22 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>Guest requests</h3>
        <button className="button secondary small" onClick={() => void reload()} aria-label="Refresh requests">
          <RefreshCw size={13} />
        </button>
      </div>
      {!data && <p>Loading requests…</p>}
      {data && requests.length === 0 && <p>No requests yet. Guests can request extras from the “Little extras” tab of your guide.</p>}
      {requests.map((r) => (
        <div className="activity-item" key={r.id} style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>{r.extraName}</strong> · {money(r.price)}
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {r.propertyName} · {r.guestName} · <a href={r.guestContact.includes("@") ? `mailto:${r.guestContact}` : `tel:${r.guestContact}`}>{r.guestContact}</a> · {when(r.createdAt)}
            </div>
            {r.note && <div style={{ fontSize: 12, marginTop: 4 }}>“{r.note}”</div>}
          </div>
          <span className={`pill ${r.status === "pending" ? "amber" : ""}`}>{r.status}</span>
          {r.status === "pending" && (
            <div className="row" style={{ gap: 6 }}>
              <button className="button small" onClick={() => act(r.id, "approved")}><Check size={13} /> Approve</button>
              <button className="button secondary small" onClick={() => act(r.id, "declined")}><X size={13} /> Decline</button>
            </div>
          )}
          {r.status === "approved" && (
            <button className="button secondary small" onClick={() => act(r.id, "paid")}>Mark as paid</button>
          )}
        </div>
      ))}
    </div>
  );
}

type Stats = {
  views: number;
  views30: number;
  questions: number;
  resolutionRate: number;
  extrasRevenue: number;
  extraRequests: number;
  topQuestions: { question: string; count: number }[];
  aiMessagesThisMonth: number;
};
export function LiveAnalytics() {
  const { data, error } = usePoll<Stats>("/api/v1/analytics", 60000);
  return (
    <>
      <PageHeading title="Good stays, by the numbers" description="A little insight into what makes your guests feel at home." />
      {error && <div className="notice">Couldn’t load analytics.</div>}
      {!data && !error && <div className="card panel">Loading…</div>}
      {data && (
        <>
          <div className="stats-grid">
            {[
              ["Guide views (all time)", data.views.toLocaleString()],
              ["Views, last 30 days", data.views30.toLocaleString()],
              ["Guest questions", data.questions.toLocaleString()],
              ["Answered without you", data.questions ? `${data.resolutionRate}%` : "—"],
              ["Extras approved", money(data.extrasRevenue)],
              ["Extra requests", String(data.extraRequests)],
              ["AI messages this month", String(data.aiMessagesThisMonth)],
            ].map(([label, value]) => (
              <div className="card stat-card" key={label}>
                <div className="stat-top">{label}</div>
                <div className="stat-value">{value}</div>
              </div>
            ))}
          </div>
          <div className="card panel" style={{ marginTop: 25 }}>
            <h3>The things guests ask</h3>
            {data.topQuestions.length === 0 && <p>Questions will appear here once guests start chatting.</p>}
            {data.topQuestions.map((q) => (
              <div className="activity-item" key={q.question}>
                <span style={{ flex: 1, fontSize: 12 }}>{q.question}</span>
                <strong>{q.count}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
