"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Guide = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published";
  version: string;
  missing: string[];
  hasRules: boolean;
  rulesBody: string | null;
};

/** Deliberately manual. Nothing is published, sent, or rewritten without host confirmation. */
export function PortfolioGuideOperations({ notify }: { notify: (message: string) => void }) {
  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/manager/guides", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the portfolio guide audit.");
      const result = await response.json() as { guides: Guide[] };
      setGuides(result.guides);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Guide audit unavailable.");
    }
  }, []);
  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const chosen = (guides ?? []).filter(guide => selectedIds.includes(guide.id));
  const clearPreview = () => { setPreview(false); setReviewed(false); };
  const toggle = (id: string, checked: boolean) => {
    setSelectedIds(old => checked ? [...old, id].slice(0, 25) : old.filter(value => value !== id));
    clearPreview();
  };

  async function apply() {
    if (sending.current || !reviewed || !preview || chosen.length === 0 || body.trim().length < 20) return;
    sending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/v1/manager/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targets: chosen.map(guide => ({ id: guide.id, version: guide.version })),
          rulesBody: body.trim(),
          confirm: true,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; updated?: string[] };
      if (!response.ok) throw new Error(result.error ?? "Could not apply the shared house rules.");
      setSelectedIds([]);
      setBody("");
      clearPreview();
      await load();
      notify(`Updated house rules for ${result.updated?.length ?? 0} selected guides. Review the published guest versions.`);
    } catch (cause) {
      setPreview(false);
      setReviewed(false);
      notify(cause instanceof Error ? cause.message : "Bulk update failed.");
      await load();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="card panel" aria-label="Portfolio guide readiness" style={{ marginBottom: 20 }}>
      <h3>Guest-guide readiness across your properties</h3>
      <p style={{ fontSize: 13 }}>Check that each guide has arrival, checkout and house rules before guests arrive. Parking information and a host contact may need review. This audit does not send messages or publish a guide.</p>
      {error && <p role="alert">{error} <button className="button secondary small" type="button" onClick={() => void load()}>Retry</button></p>}
      {!guides && !error && <p>Loading your portfolio…</p>}
      {guides && (
        <>
          <p className="muted" style={{ fontSize: 12 }}>{guides.length} properties reviewed (maximum 50). {guides.filter(g => g.missing.length > 0).length} need additional information.</p>
          {guides.length === 0 && <p>No properties yet. Add a guide in Properties first.</p>}
          {guides.map(guide => (
            <div className="activity-item" key={guide.id} style={{ gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong>{guide.name}</strong> · {guide.status}
                {guide.missing.length > 0
                  ? <p style={{ fontSize: 12 }}>Review: {guide.missing.join(", ")}</p>
                  : <p style={{ fontSize: 12 }}>Core guest information is present. Confirm it is accurate before sharing.</p>}
              </div>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}>
                <input type="checkbox" checked={selectedIds.includes(guide.id)}
                  disabled={busy || !guide.hasRules || (selectedIds.length >= 25 && !selectedIds.includes(guide.id))}
                  onChange={event => toggle(guide.id, event.target.checked)} />
                Select to update house rules
              </label>
              {!guide.hasRules && <small>Requires exactly one existing house-rules section</small>}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 20, paddingTop: 18 }}>
            <h3>Apply shared house rules to selected properties</h3>
            <p style={{ fontSize: 13 }}>Only use this for policies that are genuinely identical. Property-specific safety, access, parking and checkout instructions are not changed. You must preview existing rules and explicitly confirm the replacement.</p>
            <label>Replacement house-rules text
              <textarea rows={6} maxLength={6000} minLength={20} value={body}
                onChange={event => { setBody(event.target.value); clearPreview(); }}
                placeholder="Enter the exact house rules approved for all selected properties." />
            </label>
            <p className="muted" style={{ fontSize: 12 }}>{chosen.length} selected · maximum 25 per update</p>
            <button type="button" className="button secondary" disabled={busy || chosen.length === 0 || body.trim().length < 20}
              onClick={() => { setPreview(true); setReviewed(false); }}>
              Preview selected changes
            </button>
            {preview && (
              <div role="region" aria-label="Bulk update preview" style={{ marginTop: 20 }}>
                <h3>Review every change before applying</h3>
                {chosen.map(guide => (
                  <div className="activity-item" key={guide.id} style={{ display: "block" }}>
                    <strong>{guide.name} ({guide.status})</strong>
                    <p><small>Current house rules</small></p>
                    <p style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{guide.rulesBody}</p>
                    <p><small>Proposed replacement</small></p>
                    <p style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{body.trim()}</p>
                  </div>
                ))}
                <label style={{ display: "flex", gap: 10, alignItems: "start", marginTop: 12 }}>
                  <input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />
                  I reviewed each selected property's existing rules and approve replacing them with the new text.
                </label>
                <button type="button" className="button" disabled={busy || !reviewed}
                  onClick={() => void apply()} style={{ marginTop: 12 }}>
                  {busy ? "Updating…" : `Apply house rules to ${chosen.length} guides`}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
