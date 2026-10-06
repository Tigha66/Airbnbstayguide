"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Lock, Trash2 } from "lucide-react";
import { stayWindow, type Property } from "@stayguide/shared";

type Stay = { id: string; guestName: string; checkIn: string; checkOut: string; token: string };

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const statusLabel = { upcoming: "Upcoming", active: "Link active", ended: "Ended" } as const;

/** Private details (door codes, protected Wi-Fi) and per-stay links for one property. */
export function PrivateAccessPanel({
  property,
  live,
  save,
  notify,
}: {
  property: Property;
  live: boolean;
  save: (next: Property) => void;
  notify: (message: string) => void;
}) {
  const [stays, setStays] = useState<Stay[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!live) return;
    try {
      const res = await fetch(`/api/v1/properties/${property.id}/stays`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setStays((await res.json()).stays);
    } catch {
      setStays([]);
    }
  }, [live, property.id]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const linkFor = (stay: Stay) => `${location.origin}/g/${property.slug}?stay=${stay.token}`;
  async function copy(stay: Stay) {
    try {
      await navigator.clipboard.writeText(linkFor(stay));
      notify(`Private link for ${stay.guestName} copied.`);
    } catch {
      prompt("Copy this private link", linkFor(stay));
    }
  }

  return (
    <section className="card panel private-panel" aria-labelledby="private-heading" style={{ marginTop: 20 }}>
      <div className="row" style={{ gap: 10 }}>
        <Lock size={18} color="#7c906b" />
        <h3 id="private-heading">Private stay details</h3>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: "8px 0 16px" }}>
        Door codes and other private details are never shown on your public guide link. Each guest gets their own
        private link that only works from the day before check-in until the day after checkout.
      </p>
      <div className="form-grid two-col">
        <label>
          Wi-Fi network
          <input value={property.wifi} maxLength={120} onChange={(e) => save({ ...property, wifi: e.target.value })} />
        </label>
        <label>
          Wi-Fi password
          <input
            value={property.wifiPassword}
            maxLength={120}
            onChange={(e) => save({ ...property, wifiPassword: e.target.value })}
          />
        </label>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(property.wifiPrivate)}
          onChange={(e) => save({ ...property, wifiPrivate: e.target.checked })}
        />
        Only show the Wi-Fi password to guests with a private stay link
      </label>
      <label style={{ display: "block", marginTop: 14 }}>
        Private arrival details
        <textarea
          rows={4}
          maxLength={4000}
          value={property.privateNotes ?? ""}
          placeholder={"Door code: 4821#\nLockbox by the gate: 1234\nParking garage code: 9090"}
          onChange={(e) => save({ ...property, privateNotes: e.target.value })}
        />
      </label>
      <small className="muted">Shown only to guests with a valid private link. The AI concierge never sees these.</small>

      <div className="row" style={{ gap: 10, marginTop: 24 }}>
        <KeyRound size={18} color="#7c906b" />
        <h3>Guest stay links</h3>
      </div>
      {!live ? (
        <div className="notice" style={{ marginTop: 12 }}>
          Sign in to create private links for real guests.
        </div>
      ) : (
        <>
          <form
            className="stay-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const form = new FormData(formEl);
              setBusy(true);
              try {
                const res = await fetch(`/api/v1/properties/${property.id}/stays`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    guestName: form.get("guestName"),
                    checkIn: form.get("checkIn"),
                    checkOut: form.get("checkOut"),
                  }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body.error || "Couldn’t create the link.");
                formEl.reset();
                await load();
                await copy(body.stay);
              } catch (err) {
                notify(err instanceof Error ? err.message : "Couldn’t create the link.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Guest name
              <input name="guestName" required maxLength={120} placeholder="Maria Lopez" />
            </label>
            <label>
              Check-in
              <input name="checkIn" type="date" required />
            </label>
            <label>
              Checkout
              <input name="checkOut" type="date" required />
            </label>
            <button className="button" disabled={busy}>
              Create private link
            </button>
          </form>
          {stays === null ? (
            <p className="muted" role="status">Loading stays…</p>
          ) : stays.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>No stay links yet.</p>
          ) : (
            <ul className="stay-list">
              {stays.map((stay) => {
                const status = stayWindow(stay.checkIn, stay.checkOut);
                return (
                  <li key={stay.id}>
                    <div>
                      <strong>{stay.guestName}</strong>
                      <span className="muted">
                        {day(stay.checkIn)} → {day(stay.checkOut)}
                      </span>
                    </div>
                    <span className={`pill ${status}`}>{statusLabel[status]}</span>
                    <button className="button secondary small" onClick={() => copy(stay)} aria-label={`Copy link for ${stay.guestName}`}>
                      <Copy size={13} />
                      Copy link
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Remove link for ${stay.guestName}`}
                      onClick={async () => {
                        if (!confirm(`Remove ${stay.guestName}’s link? It will stop working immediately.`)) return;
                        const res = await fetch(`/api/v1/stays/${stay.id}`, { method: "DELETE" });
                        if (res.ok) {
                          notify("Link removed.");
                          await load();
                        } else notify("Couldn’t remove the link.");
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
