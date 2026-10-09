"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Property } from "@stayguide/shared";
import { GuestGuide } from "./guest-guide";

export function TryGuide({
  title = "Your guest guide in 60 seconds. Your guests answered 24/7.",
  body = "Paste your house manual, Airbnb description, or rough notes. StayGuide turns it into a guest-ready guide you can edit before publishing.",
  compact = false,
}: {
  title?: string;
  body?: string;
  compact?: boolean;
}) {
  const [manual, setManual] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [property, setProperty] = useState<Property | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/v1/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual, listingUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not build a preview.");
      setProperty(body.property);
      setNotice(body.listingNotice || (body.ai ? "AI organized your guide preview." : "Preview built with the offline parser."));
      setTimeout(() => document.getElementById("try-preview")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build a preview.");
    } finally {
      setBusy(false);
    }
  }
  function saveDraft() {
    if (!property) return;
    try {
      sessionStorage.setItem("stayguide-draft-property", JSON.stringify(property));
    } catch {
      /* The dashboard can still be opened manually. */
    }
  }
  return (
    <section className={compact ? "try-inline" : "try-page-shell"}>
      <div className="try-builder">
        <div className="eyebrow">AI GUIDE BUILDER</div>
        <h1>{title}</h1>
        <p>{body}</p>
        <form
          className="try-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label>
            Paste your house manual, Airbnb description, or notes
            <textarea
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              maxLength={12000}
              placeholder={"WI-FI: Network \"HarbourFlat\", password \"porto2026\"\nCHECK-IN: From 3 PM. The key box is beside the blue door.\nHOUSE RULES: No smoking, quiet after 10 PM."}
            />
          </label>
          <label>
            Or paste your Airbnb listing URL
            <input value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://www.airbnb.com/rooms/..." />
          </label>
          {error && <p className="error-text">{error}</p>}
          {notice && <p className="notice" role="status">{notice}</p>}
          <button className="button" disabled={busy || (!manual.trim() && !listingUrl.trim())}>
            <Sparkles size={16} />
            {busy ? "Building your guide..." : "Preview my guide"}
          </button>
        </form>
      </div>
      {property && (
        <div id="try-preview" className="try-preview">
          <div className="try-publish-bar">
            <strong>{property.name}</strong>
            <span>Ready to edit and publish.</span>
            <Link className="button small" href="/login" onClick={saveDraft}>
              Sign in to publish this guide
              <ArrowRight size={13} />
            </Link>
            <Link className="button secondary small" href="/dashboard" onClick={saveDraft}>
              Try in demo
            </Link>
          </div>
          <GuestGuide slug={property.slug} initial={property} preview />
        </div>
      )}
    </section>
  );
}
