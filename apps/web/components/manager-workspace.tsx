"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Plus, Trash2, ArrowRight } from "lucide-react";
import { PageHeading } from "./ui";
import { matchPortfolioRule } from "@/lib/portfolio-rules";

type Rule = { id: string; keyword: string; label: string; priority: "normal" | "urgent"; enabled: boolean };
type Triage = { threadId: string; propertyName: string; label: string; priority: "normal" | "urgent"; status: "open" | "resolved"; updatedAt: string };
type ReplyTemplate = { id: string; title: string; body: string };
type Workspace = { rules: Rule[]; triage: Triage[]; templates: ReplyTemplate[] };

export function ManagerWorkspace({ notify, complimentary = false }: { notify: (message: string) => void; complimentary?: boolean }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const [keyword, setKeyword] = useState("");
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [queueStatus, setQueueStatus] = useState("open");
  const [queuePriority, setQueuePriority] = useState("all");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
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
    if (mutationLock.current) return false;
    mutationLock.current = true;
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
    } finally { mutationLock.current = false; setBusy(false); }
  }
  async function addRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate(editingRuleId ? `/api/v1/manager/rules/${editingRuleId}` : "/api/v1/manager/rules", editingRuleId ? "PATCH" : "POST", { keyword, label, priority });
    if (ok) { setKeyword(""); setLabel(""); setEditingRuleId(null); notify("Rule saved disabled. Enable it when ready."); }
  }
  async function addTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate(editingTemplateId ? `/api/v1/manager/templates/${editingTemplateId}` : "/api/v1/manager/templates",
      editingTemplateId ? "PATCH" : "POST", { title: templateTitle, body: templateBody });
    if (ok) {
      setTemplateTitle(""); setTemplateBody(""); setEditingTemplateId(null);
      notify("Reply saved. It will only be sent if you choose to send it.");
    }
  }
  return (
    <>
      <PageHeading title="StayGuide Manager" description="One guest communication workspace across your rental portfolio." />
      {complimentary && <div className="notice" style={{ marginBottom: 16 }}>
        Manager feature access is enabled for your account. Your existing subscription and billing are unchanged.
      </div>}
      <div className="notice" style={{ marginBottom: 16 }}>
        Keyword rules classify conversations inside StayGuide. They do not send automatic replies, contact guests, or sync with a PMS.
      </div>
      {error && <div className="notice" role="alert">{error} <button className="button secondary small" onClick={() => void load()}>Retry loading</button></div>}
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
              <button className="button" disabled={busy || (!editingRuleId && data.rules.length >= 20)}><Plus size={14} /> {editingRuleId ? "Update rule" : "Save rule"}</button>
              {editingRuleId && <button className="button secondary" type="button" disabled={busy} onClick={() => { setEditingRuleId(null); setKeyword(""); setLabel(""); }}>Cancel rule edit</button>}
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
                <button className="button secondary small" disabled={busy} onClick={() => {
                  setEditingRuleId(rule.id); setKeyword(rule.keyword); setLabel(rule.label); setPriority(rule.priority);
                }}>Edit rule</button>
                <button className="button secondary small" disabled={busy} aria-label={`Delete ${rule.label}`}
                  onClick={() => void mutate(`/api/v1/manager/rules/${rule.id}`, "DELETE")}><Trash2 size={13} /></button>
              </div>
            ))}
            <label>Test a guest message
              <textarea rows={2} maxLength={2000} value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Try a message against your enabled rules" />
            </label>
            {testMessage && <p role="status">{(() => {
              const match = matchPortfolioRule(data.rules, testMessage);
              return match ? `Matches ${match.label} · ${match.priority}. Preview only; no message or queue entry was created.` : "No enabled rule matches. Preview only; nothing was sent or saved.";
            })()}</p>}
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
              <button className="button" disabled={busy || (!editingTemplateId && (data.templates?.length ?? 0) >= 30)}>
                <Plus size={14} /> {editingTemplateId ? "Update reply" : "Save reply"}
              </button>
              {editingTemplateId && <button type="button" className="button secondary" disabled={busy}
                onClick={() => { setEditingTemplateId(null); setTemplateTitle(""); setTemplateBody(""); }}>Cancel edit</button>}
            </form>
            {(data.templates ?? []).length === 0 && <p>No saved replies yet.</p>}
            {(data.templates ?? []).map((template) => (
              <div className="activity-item" key={template.id} style={{ gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 170 }}>
                  <strong>{template.title}</strong>
                  <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{template.body}</div>
                </div>
                <button className="button secondary small" disabled={busy} onClick={() => {
                  setEditingTemplateId(template.id); setTemplateTitle(template.title); setTemplateBody(template.body);
                }}>Edit</button>
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
            <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <label>Queue status <select value={queueStatus} onChange={(e) => setQueueStatus(e.target.value)}><option value="open">Open</option><option value="resolved">Resolved</option><option value="all">All statuses</option></select></label>
              <label>Queue priority <select value={queuePriority} onChange={(e) => setQueuePriority(e.target.value)}><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="normal">Normal</option></select></label>
              <button className="button secondary small" disabled={busy} onClick={() => void load()}>Refresh queue</button>
            </div>
            {data.triage.length === 0 && <p>No matched guest messages. Once a guest writes a keyword, the conversation will be routed here.</p>}
            {data.triage.filter(item => (queueStatus === "all" || item.status === queueStatus) && (queuePriority === "all" || item.priority === queuePriority)).map((item) => (
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
