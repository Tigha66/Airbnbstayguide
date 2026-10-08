"use client";
import { useCallback, useEffect, useState } from "react";
import { Send, Check, X, RefreshCw, CreditCard, Landmark, ExternalLink } from "lucide-react";
import { money, plans, CURRENCY, CURRENCY_SYMBOL, type Plan } from "@stayguide/shared";
import { PageHeading } from "./ui";
import { HotelPlanCard } from "./hotel-plan";
import { useAppLocale } from "./app-locale";
import { siteText } from "@/lib/site-i18n";

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
  prepaid: boolean;
  createdAt: string;
};
const when = (iso: string, locale?: string) =>
  new Date(iso).toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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
  const { locale, tr } = useAppLocale();
  const { data, error, reload } = usePoll<{ threads: Thread[] }>("/api/v1/inbox", 10000);
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [onlyEscalated, setOnlyEscalated] = useState(true);
  const threads = (data?.threads ?? []).filter((t) => !onlyEscalated || t.escalated);
  const thread = threads.find((t) => t.threadId === selected) ?? threads[0];
  return (
    <>
      <PageHeading title={tr("A little human touch")} description={tr("Your concierge takes care of the everyday. You take care of the rest.")}>
        <label className="row" style={{ gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={onlyEscalated} onChange={(e) => setOnlyEscalated(e.target.checked)} />
          {tr("Needs your help only")}
        </label>
      </PageHeading>
      {error && <div className="notice">{tr("Couldn’t load conversations. Retrying…")}</div>}
      {!data && !error && <div className="card panel">{tr("Loading conversations…")}</div>}
      {data && threads.length === 0 && (
        <div className="card panel">
          <h3>{tr("All quiet for now")}</h3>
          <p>{tr("When a guest asks something your guide doesn’t answer, the conversation appears here so you can reply.")}</p>
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
                    <strong>{tr("Guest")}</strong>
                  </div>
                  <span>{t.propertyName} · {when(t.lastAt, locale)}</span>
                  <span>{firstGuest?.content}</span>
                  {t.escalated && <span className="pill amber" style={{ width: "fit-content" }}>{tr("Needs your help")}</span>}
                </button>
              );
            })}
          </div>
          <div className="chat-panel">
            <div className="row">
              <span className="avatar">G</span>
              <div>
                <h3>{tr("Guest")}</h3>
                <small>{thread.propertyName}</small>
              </div>
            </div>
            <div className="chat-messages">
              {thread.messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role === "host" ? "host" : ""}`} style={m.role === "assistant" ? { opacity: 0.75 } : undefined}>
                  <small style={{ display: "block", fontSize: 10, opacity: 0.7 }}>
                    {m.role === "guest" ? tr("Guest") : m.role === "host" ? tr("You") : tr("Concierge")} · {when(m.createdAt, locale)}
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
                  notify(tr("Reply sent. The guest sees it in their guide chat."));
                  void reload();
                } else notify(tr("Couldn’t send your reply. Please try again."));
              }}
            >
              <input aria-label={tr("Reply to guest")} placeholder={tr("A thoughtful reply…")} value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="button" aria-label={tr("Send reply")}>
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
  const { locale, tr } = useAppLocale();
  const { data, reload } = usePoll<{ requests: ExtraRequest[] }>("/api/v1/extra-requests", 20000);
  const act = async (id: string, status: "approved" | "declined" | "paid" | "refunded") => {
    const res = await fetch(`/api/v1/extra-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => ({}));
    const done: Record<string, string> = {
      paid: tr("Payment captured. The money is on its way to your bank."),
      approved: tr("Request approved. Let your guest know how to pay."),
      declined: tr("Request declined. Any card hold has been released."),
      refunded: tr("Refund issued to the guest."),
    };
    notify(res.ok ? done[body.status] ?? tr("Request updated.") : body.error || tr("Couldn’t update the request."));
    void reload();
  };
  const requests = data?.requests ?? [];
  return (
    <div className="card panel" style={{ marginBottom: 22 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{tr("Guest requests")}</h3>
        <button className="button secondary small" onClick={() => void reload()} aria-label={tr("Refresh requests")}>
          <RefreshCw size={13} />
        </button>
      </div>
      {!data && <p>{tr("Loading requests…")}</p>}
      {data && requests.length === 0 && <p>{tr("No requests yet. Guests can request extras from the “Little extras” tab of your guide.")}</p>}
      {requests.map((r) => (
        <div className="activity-item" key={r.id} style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>{r.extraName}</strong> · {money(r.price)}
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {r.propertyName} · {r.guestName} · <a href={r.guestContact.includes("@") ? `mailto:${r.guestContact}` : `tel:${r.guestContact}`}>{r.guestContact}</a> · {when(r.createdAt, locale)}
            </div>
            {r.note && <div style={{ fontSize: 12, marginTop: 4 }}>“{r.note}”</div>}
          </div>
          <span className={`pill ${r.status === "pending" ? "amber" : ""}`}>{tr(r.status)}</span>
          {r.prepaid && r.status !== "refunded" && <span className="pill">{r.status === "pending" ? tr("card authorised") : tr("paid online")}</span>}
          {r.status === "pending" && (
            <div className="row" style={{ gap: 6 }}>
              <button className="button small" onClick={() => act(r.id, "approved")}><Check size={13} /> {r.prepaid ? tr("Approve & charge") : tr("Approve")}</button>
              <button className="button secondary small" onClick={() => act(r.id, "declined")}><X size={13} /> {r.prepaid ? tr("Decline & release") : tr("Decline")}</button>
            </div>
          )}
          {r.status === "approved" && !r.prepaid && (
            <button className="button secondary small" onClick={() => act(r.id, "paid")}>{tr("Mark as paid")}</button>
          )}
          {r.status === "paid" && r.prepaid && (
            <button className="button secondary small" onClick={() => { if (confirm(tr("Refund this guest in full?"))) void act(r.id, "refunded"); }}>{tr("Refund")}</button>
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
  aiMessageLimit?: number;
};
export function LiveAnalytics() {
  const { tr } = useAppLocale();
  const { data, error } = usePoll<Stats>("/api/v1/analytics", 60000);
  return (
    <>
      <PageHeading title={tr("Good stays, by the numbers")} description={tr("A little insight into what makes your guests feel at home.")} />
      {error && <div className="notice">{tr("Couldn’t load analytics.")}</div>}
      {!data && !error && <div className="card panel">{tr("Loading…")}</div>}
      {data && (
        <>
          <div className="stats-grid">
            {[
              [tr("Guide views (all time)"), data.views.toLocaleString()],
              [tr("Views, last 30 days"), data.views30.toLocaleString()],
              [tr("Guest questions"), data.questions.toLocaleString()],
              [tr("Answered without you"), data.questions ? `${data.resolutionRate}%` : "—"],
              [tr("Extras approved"), money(data.extrasRevenue)],
              [tr("Extra requests"), String(data.extraRequests)],
              [tr("AI messages this month"), data.aiMessageLimit ? `${data.aiMessagesThisMonth.toLocaleString()} / ${data.aiMessageLimit.toLocaleString()}` : String(data.aiMessagesThisMonth)],
            ].map(([label, value]) => (
              <div className="card stat-card" key={label}>
                <div className="stat-top">{label}</div>
                <div className="stat-value">{value}</div>
              </div>
            ))}
          </div>
          <div className="card panel" style={{ marginTop: 25 }}>
            <h3>{tr("The things guests ask")}</h3>
            {data.topQuestions.length === 0 && <p>{tr("Questions will appear here once guests start chatting.")}</p>}
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

type BillingState = {
  stripe: boolean;
  plan: Plan;
  status: string | null;
  subscribed: boolean;
  propertyCount: number;
  billableQuantity: number;
  payouts: { started: boolean; ready: boolean };
};
const COUNTRIES: [string, string][] = [
  ["GB", "United Kingdom"], ["US", "United States"], ["IE", "Ireland"], ["FR", "France"], ["ES", "Spain"], ["PT", "Portugal"],
  ["IT", "Italy"], ["DE", "Germany"], ["NL", "Netherlands"], ["BE", "Belgium"], ["AT", "Austria"], ["CH", "Switzerland"],
  ["GR", "Greece"], ["HR", "Croatia"], ["DK", "Denmark"], ["SE", "Sweden"], ["NO", "Norway"], ["FI", "Finland"],
  ["PL", "Poland"], ["CZ", "Czech Republic"], ["CA", "Canada"], ["AU", "Australia"], ["NZ", "New Zealand"], ["AE", "United Arab Emirates"],
];
async function postForUrl(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { code: data.code });
  window.location.assign(data.url);
}

export function LiveBilling({ notify }: { notify: (m: string) => void }) {
  const { locale, tr } = useAppLocale();
  const { data, error, reload } = usePoll<BillingState>("/api/v1/billing", 60000);
  // Country names in the dashboard language (falls back to English names).
  const countryName = (code: string, fallback: string) => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const [yearly, setYearly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // The country picker only renders after billing loads client-side, so reading navigator here is hydration-safe.
  const [country, setCountry] = useState(() => {
    const guess = typeof navigator === "undefined" ? "" : navigator.language.split("-")[1]?.toUpperCase();
    return guess && COUNTRIES.some(([c]) => c === guess) ? guess : "GB";
  });
  const [connectBlocked, setConnectBlocked] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const messages: Record<string, string> = {
      "checkout=success": tr("Thank you! Your plan is being activated. This can take a few seconds."),
      "checkout=cancelled": tr("Checkout cancelled. Nothing was charged."),
      "payouts=done": tr("Payout details saved. Stripe may take a moment to verify them."),
      "payouts=retry": tr("That setup link expired. Please continue payout setup."),
    };
    for (const [k, msg] of Object.entries(messages)) {
      const [key, value] = k.split("=");
      if (q.get(key) === value) {
        notify(msg);
        window.history.replaceState(null, "", window.location.pathname);
        if (key === "checkout") setTimeout(reload, 3000);
      }
    }
  }, [notify, reload, tr]);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "CONNECT_NOT_ENABLED") setConnectBlocked(true);
      notify(err.message);
      setBusy(null);
    }
  };
  if (error && !data) return <div className="notice">{tr("Couldn’t load billing. Please refresh the page.")}</div>;
  if (!data) return <p>{tr("Loading billing…")}</p>;
  const hotelText = siteText(locale).hotel;
  const planName = (plan: Plan) => (plan === "free" ? tr("Free") : plan === "hotel" ? hotelText.name : plans[plan].name);
  const countText = (n: number) => (n === 1 ? tr("1 property") : tr("{n} properties", { n }));
  const qty = data.billableQuantity;
  return (
    <>
      <PageHeading title={tr("Plans & billing")} description={tr("Simple, per-property pricing. Change or cancel any time.")} />
      {!data.stripe && <div className="notice" style={{ marginBottom: 16 }}>{tr("Payments are not connected on this deployment yet.")}</div>}
      <div className="card panel" style={{ marginBottom: 20 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">{tr("Current plan")}</div>
            <h3 style={{ margin: "4px 0" }}>
              {planName(data.plan)}
              {data.status && data.status !== "active" && <span className="pill amber" style={{ marginInlineStart: 8 }}>{tr(data.status.replace("_", " "))}</span>}
            </h3>
            <small>
              {countText(data.propertyCount)} · {tr("up to {n} on this plan", { n: plans[data.plan].properties.toLocaleString() })} ·{" "}
              {tr("{n} AI messages / property / month", { n: plans[data.plan].messages.toLocaleString() })}
            </small>
          </div>
          {data.subscribed && (
            <button className="button" disabled={busy !== null} onClick={() => run("portal", () => postForUrl("/api/v1/billing/portal"))}>
              <CreditCard size={15} /> {busy === "portal" ? tr("Opening…") : tr("Manage billing")}
            </button>
          )}
        </div>
        {data.status === "past_due" && <div className="notice" style={{ marginTop: 12 }}>{tr("Your last payment failed. Please update your card in “Manage billing” to keep your plan.")}</div>}
      </div>

      {data.plan === "hotel" && (
        <>
          <div className="notice" style={{ marginBottom: 16 }}>
            {tr("Your Hotel & Multi-Unit plan is managed by StayGuide and invoiced separately. Contact us to change it.")}
          </div>
          <div className="pricing-grid">
            <HotelPlanCard current text={hotelText} />
          </div>
        </>
      )}
      {!data.subscribed && data.plan !== "hotel" && (
        <>
          <div className="filter-bar">
            <small>{tr("Billed for {n} · updates automatically as you add or remove properties", { n: countText(qty) })}</small>
            <div className="tabs">
              <button className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>{tr("Monthly")}</button>
              <button className={yearly ? "active" : ""} onClick={() => setYearly(true)}>{tr("Yearly · 2 months free")}</button>
            </div>
          </div>
          <div className="pricing-grid">
            {(["starter", "pro"] as const).map((plan) => (
              <div className={`card pricing-card ${plan === "pro" ? "featured" : ""}`} key={plan}>
                <div className="eyebrow">{plans[plan].name}</div>
                <h3>{plan === "starter" ? tr("For the independent host") : tr("Your hospitality, elevated")}</h3>
                <div className="price">{CURRENCY_SYMBOL}{plans[plan].monthly * qty * (yearly ? 10 : 1)}</div>
                <small>
                  {yearly ? tr("per year") : tr("per month")} · {tr("{price}/property/month", { price: `${CURRENCY_SYMBOL}${plans[plan].monthly}` })}
                  {yearly ? tr(", billed yearly") : ""}
                </small>
                <ul>
                  <li><Check size={14} /> {tr("Up to {n} properties", { n: plans[plan].properties })}</li>
                  <li><Check size={14} /> {tr("{n} AI concierge messages / property / month", { n: plans[plan].messages.toLocaleString() })}</li>
                  <li><Check size={14} /> {tr("Paid extras · 5% platform fee")}</li>
                  {plan === "pro" && <li><Check size={14} /> {tr("Priority support")}</li>}
                </ul>
                <button
                  className={`button ${plan === "pro" ? "" : "secondary"}`}
                  disabled={!data.stripe || busy !== null}
                  onClick={() => run(plan, () => postForUrl("/api/v1/billing/checkout", { plan, yearly }))}
                >
                  {busy === plan ? tr("Opening checkout…") : tr("Choose {plan}", { plan: plans[plan].name })}
                </button>
              </div>
            ))}
            <HotelPlanCard text={hotelText} />
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
            {tr("Prices in {code} ({symbol}). Secure payment by Stripe. Cancel any time from “Manage billing”.", { code: CURRENCY.toUpperCase(), symbol: CURRENCY_SYMBOL })}
          </p>
        </>
      )}

      <div className="card panel" style={{ marginTop: 24 }}>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <Landmark size={18} />
          <h3 style={{ margin: 0 }}>{tr("Get paid for extras")}</h3>
          {data.payouts.ready && <span className="pill">{tr("Active")}</span>}
        </div>
        {data.payouts.ready ? (
          <>
            <p>{tr("Guests pay for extras by card, Apple Pay or Google Pay. Money goes straight to your bank via Stripe, minus a 5% StayGuide fee. Extras that need your approval are only charged when you approve them.")}</p>
            <button className="button secondary" disabled={busy !== null} onClick={() => run("dash", () => postForUrl("/api/v1/connect/dashboard"))}>
              <ExternalLink size={14} /> {busy === "dash" ? tr("Opening…") : tr("Open payouts dashboard")}
            </button>
          </>
        ) : connectBlocked ? (
          <p>{tr("Online payments for extras are coming soon. Until then, guests send requests and you confirm how they pay.")}</p>
        ) : (
          <>
            <p>{tr("Connect a bank account with Stripe so guests can pay for extras online. Until then, guests send requests and you confirm payment yourself.")}</p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              {!data.payouts.started && (
                <label>
                  {tr("Country of your bank account")}
                  <select value={country} onChange={(e) => setCountry(e.target.value)}>
                    {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{countryName(code, name)}</option>)}
                  </select>
                </label>
              )}
              <button className="button" disabled={!data.stripe || busy !== null} onClick={() => run("connect", () => postForUrl("/api/v1/connect", data.payouts.started ? {} : { country }))}>
                {busy === "connect" ? tr("Opening Stripe…") : data.payouts.started ? tr("Continue payout setup") : tr("Set up payouts")}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
