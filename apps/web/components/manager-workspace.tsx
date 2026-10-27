"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Plus, Trash2, ArrowRight } from "lucide-react";
import { PageHeading } from "./ui";

type Rule = { id: string; keyword: string; label: string; priority: "normal" | "urgent"; enabled: boolean };
type Triage = { threadId: string; propertyName: string; label: string; priority: "normal" | "urgent"; status: "open" | "resolved"; updatedAt: string };
type ReplyTemplate = { id: string; title: string; body: string };
type Workspace = { rules: Rule[]; triage: Triage[]; templates: ReplyTemplate[] };

export function ManagerWorkspace({ notify }: { notify: (message: string) => void }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/manager", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load Manager data. Check the plan and database migration.");
      setData(await response.json() as Workspace);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load Manager workspace."); }
  }, []);
  useEffect(() => {
    const handle = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  async function mutate(url: string, method: "POST" | "PATCH" | "DELETE", body?: object) {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not save the change.");
      await load();
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save the change.");
      return false;
    } finally { setBusy(false); }
  }
  async function addRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate("/api/v1/manager/rules", "POST", { keyword, label, priority });
    if (ok) { setKeyword(""); setLabel(""); notify("Rule saved disabled. Enable it when ready."); }
  }
  async function addTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate("/api/v1/manager/templates", "POST", { title: templateTitle, body: templateBody });
    if (ok) { setTemplateTitle(""); setTemplateBody(""); notify("Saved reply added. It will only be sent if you choose to send it."); }
  }
  return (
    <>
      <PageHeading title="StayGuide Manager" description="One guest communication workspace across your rental portfolio." />
      <div className="notice" style={{ marginBottom: 16 }}>
        Keyword rules classify conversations inside StayGuide. They do not send automatic replies, contact guests, or sync with a PMS.
      </div>
      {error && <div className="notice" role="alert">{error}</div>}
      {!data && !error && <p>Loading Manager workspace…</p>}
      {data && (
        <>
          <div className="card panel" style={{ marginBottom: 20 }}>
            <h3>Inbox automation rules</h3>
            <p style={{ fontSize: 13 }}>Up to 20 rules. A new guest message containing an enabled keyword will appear in your triage queue.</p>
            <form className="form-grid" onSubmit={(e) => void addRule(e)}>
              <label>Guest message keyword
                <input required minLength={2} maxLength={50} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. water leak" />
              </label>
              <label>Queue label
                <input required minLength={2} maxLength={50} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Maintenance" />
              </label>
              <label>Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value as "normal" | "urgent")}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <button className="button" disabled={busy || data.rules.length >= 20}><Plus size={14} /> Save rule</button>
            </form>
            {data.rules.length === 0 && <p>No rules yet. Add one above; it will start disabled.</p>}
            {data.rules.map((rule) => (
              <div key={rule.id} className="activity-item" style={{ gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 165 }}>
                  <strong>{rule.label}</strong> · <span className={rule.priority === "urgent" ? "pill amber" : "pill"}>{rule.priority}</span>
                  <div style={{ fontSize: 12 }}>Contains “{rule.keyword}”</div>
                </div>
                <label className="row" style={{ gap: 6 }}>
                  <input type="checkbox" checked={rule.enabled} disabled={busy}
                    onChange={(e) => void mutate(`/api/v1/manager/rules/${rule.id}`, "PATCH", { enabled: e.target.checked })} />
                  Enabled
                </label>
                <button className="button secondary small" disabled={busy} aria-label={`Delete ${rule.label}`}
                  onClick={() => void mutate(`/api/v1/manager/rules/${rule.id}`, "DELETE")}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="card panel" style={{ marginBottom: 20 }}>
            <h3>Saved replies <small>({data.templates?.length ?? 0}/30)</small></h3>
            <p style={{ fontSize: 13 }}>Prepare reusable answers for your team. Nothing is sent automatically. Select a saved reply in the guest inbox, review it, then press Send.</p>
            <form className="form-grid" onSubmit={(e) => void addTemplate(e)}>
              <label>Reply title
                <input required minLength={2} maxLength={60} value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)} placeholder="e.g. Check-out instructions" />
              </label>
              <label>Message
                <textarea required rows={3} minLength={1} maxLength={1500} value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)} placeholder="Thanks for your message…" />
              </label>
              <button className="button" disabled={busy || (data.templates?.length ?? 0) >= 30}><Plus size={14} /> Save reply</button>
            </form>
            {(data.templates ?? []).length === 0 && <p>No saved replies yet.</p>}
            {(data.templates ?? []).map((template) => (
              <div className="activity-item" key={template.id} style={{ gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 170 }}>
                  <strong>{template.title}</strong>
                  <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{template.body}</div>
                </div>
                <button className="button secondary small" disabled={busy} onClick={async () => {
                  try { await navigator.clipboard.writeText(template.body); notify("Reply copied. Review it before sending."); }
                  catch { notify("Copy was blocked by your browser. Select the saved text manually."); }
                }}>Copy reply</button>
                <button className="button secondary small" disabled={busy} aria-label={`Delete reply ${template.title}`}
                  onClick={() => void mutate(`/api/v1/manager/templates/${template.id}`, "DELETE")}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <Link className="button secondary small" href="/dashboard/inbox">Open guest inbox <ArrowRight size={13} /></Link>
          </div>
          <div className="card panel">
            <h3>Portfolio triage <small>({data.triage.filter((t) => t.status === "open").length} open)</small></h3>
            {data.triage.length === 0 && <p>No matched guest messages. Once a guest writes a keyword, the conversation will be routed here.</p>}
            {data.triage.map((item) => (
              <div className="activity-item" key={item.threadId} style={{ gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 170 }}>
                  <strong>{item.propertyName}</strong> · {item.label}
                  <div style={{ fontSize: 12 }}>{item.priority === "urgent" ? "Urgent" : "Normal"} · {item.status} · {new Date(item.updatedAt).toLocaleString()}</div>
                </div>
                <Link className="button secondary small" href={`/dashboard/inbox?thread=${item.threadId}`}>
                  Open guest conversation <ArrowRight size={13} />
                </Link>
                <button className="button small" disabled={busy}
                  onClick={() => void mutate(`/api/v1/manager/threads/${item.threadId}`, "PATCH", { status: item.status === "open" ? "resolved" : "open" })}>
                  <Check size={13} /> {item.status === "open" ? "Resolve" : "Reopen"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
