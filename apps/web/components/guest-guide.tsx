"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Gift,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  Wifi,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { demoAnswer, languages, mapsUrl, money, type Property } from "@stayguide/shared";
import { useDemo } from "@/lib/demo-store";
import { Logo, GuideIcon } from "./ui";
type Message = {
  role: "assistant" | "user" | "host";
  content: string;
  citations?: string[];
  escalate?: boolean;
};
export function GuestGuide({
  slug,
  initial,
}: {
  slug: string;
  initial?: Property | null;
}) {
  const state = useDemo();
  const liveGuide = Boolean(initial);
  const property = initial ?? state.properties.find((p) => p.slug === slug);
  const [tab, setTab] = useState("guide");
  const [language, setLanguage] = useState("en");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [offline, setOffline] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<Event | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<Property["extras"][number] | null>(null);
  useEffect(() => {
    if (!liveGuide) return;
    void fetch(`/api/v1/guides/${slug}/view`, { method: "POST" }).catch(() => {});
    const saved = localStorage.getItem(`stayguide-thread-${slug}`);
    if (saved) queueMicrotask(() => setThreadId(saved));
  }, [liveGuide, slug]);
  useEffect(() => {
    if (!liveGuide || !threadId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/v1/guides/${slug}/threads/${threadId}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as {
          messages: { role: string; content: string; citations: string[] }[];
        };
        setMessages(
          body.messages.map((m) => ({
            role: m.role === "guest" ? "user" : m.role === "host" ? "host" : "assistant",
            content: m.content,
            citations: m.citations,
          })),
        );
      } catch {
        /* offline: keep what we have */
      }
    };
    void load();
    // Poll so host replies from the inbox appear in the guest chat.
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [liveGuide, threadId, slug]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "extras") queueMicrotask(() => setTab("extras"));
    const extra = params.get("extra");
    if (extra === "success" || extra === "cancelled") {
      queueMicrotask(() => {
        setTab("extras");
        setToast(
          extra === "success"
            ? "Thank you! Your payment is confirmed. If your host needs to approve it, you’ll only be charged once they do."
            : "Payment cancelled. Nothing was charged.",
        );
        setTimeout(() => setToast(""), 7000);
      });
      history.replaceState(null, "", location.pathname);
    }
    const detected = navigator.language.split("-")[0];
    if (languages.includes(detected as (typeof languages)[number]))
      queueMicrotask(() => setLanguage(detected));
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const install = (event: Event) => {
      event.preventDefault();
      setDeferredInstall(event);
    };
    window.addEventListener("beforeinstallprompt", install);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/g/" })
        .then(async () => {
          await navigator.serviceWorker.ready;
          const warm = () => {
            void fetch(location.pathname, { headers: { Accept: "text/html" } });
            for (const asset of performance.getEntriesByType("resource")) {
              if (
                asset.name.includes("/_next/static/") ||
                asset.name.includes("images.unsplash.com")
              )
                void fetch(asset.name, {
                  mode: asset.name.includes("images.unsplash.com")
                    ? "no-cors"
                    : "same-origin",
                }).catch(() => {});
            }
          };
          if (navigator.serviceWorker.controller) warm();
          else
            navigator.serviceWorker.addEventListener("controllerchange", warm, {
              once: true,
            });
        })
        .catch(() => {});
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);
  function notify(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 4500);
  }
  async function ask(text: string) {
    if (!property || !text.trim() || busy) return;
    setMessages((previous) => [...previous, { role: "user", content: text }]);
    setMessage("");
    setBusy(true);
    try {
      let answer: { answer: string; citations: string[]; escalate: boolean };
      if (liveGuide) {
        const res = await fetch(`/api/v1/guides/${slug}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, language, ...(threadId ? { threadId } : {}) }),
        });
        const body = await res.json();
        if (!res.ok) {
          answer = {
            answer: body.error || "The concierge is unavailable right now. Please contact your host.",
            citations: [],
            escalate: false,
          };
        } else {
          answer = body;
          if (body.threadId && body.threadId !== threadId) {
            setThreadId(body.threadId);
            localStorage.setItem(`stayguide-thread-${slug}`, body.threadId);
          }
        }
      } else {
        answer = demoAnswer(property, text);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: answer.answer,
          citations: answer.citations,
          escalate: answer.escalate,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  if (!property)
    return (
      <div className="guest-page">
        <div className="guest-body">
          <Logo />
          <div className="empty">
            <BookOpen size={32} />
            <h2>This guide isn’t here yet.</h2>
            <p>
              Check the link with your host. A guide created in the demo is
              available only in the browser where it was made.
            </p>
            <Link className="button" href="/demo">
              Explore the sample guide
            </Link>
          </div>
        </div>
      </div>
    );
  return (
    <div className="guest-page">
      {offline && (
        <div className="offline-banner">
          You’re offline. Your saved guide is still here.
        </div>
      )}
      <div className="guest-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={property.image} alt={property.name} fetchPriority="high" />
        <div className="guest-top">
          <Logo light />
          <select
            aria-label="Concierge language"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              if (e.target.value !== "en")
                notify(
                  "The sample guide is in English. AI translation requires a connected provider.",
                );
            }}
            className="guest-language"
          >
            {Object.entries({
              en: "English",
              fr: "Français",
              es: "Español",
              de: "Deutsch",
              it: "Italiano",
              pt: "Português",
              nl: "Nederlands",
              ar: "العربية",
              ja: "日本語",
              zh: "中文",
              ko: "한국어",
              hi: "हिन्दी",
            }).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="guest-cover-copy">
          <div className="eyebrow">YOUR HOME AWAY FROM HOME</div>
          <h1>{property.name}</h1>
          <p>
            <MapPin size={12} style={{ display: "inline", marginRight: 5 }} />
            {property.location}
          </p>
        </div>
      </div>
      <main className="guest-body">
        {tab === "guide" && (
          <>
            <div className="guest-welcome">
              <h2>Olá, make yourself at home.</h2>
              <p>{property.description}</p>
            </div>
            <div className="guest-quick">
              <button
                onClick={async () => {
                  if (!property.wifiPassword) {
                    notify("Ask your host for the Wi-Fi details.");
                    return;
                  }
                  try {
                    await navigator.clipboard.writeText(property.wifiPassword);
                    notify(`${property.wifi} · Password copied`);
                  } catch {
                    notify(
                      `Network: ${property.wifi} · Password: ${property.wifiPassword}`,
                    );
                  }
                }}
              >
                <Wifi size={21} />
                <span>Wi-Fi</span>
                <small>Tap to connect</small>
              </button>
              <a
                href={mapsUrl(property)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={21} />
                <span>Find your way</span>
                <small>Open in Maps</small>
              </a>
              <button
                onClick={() => {
                  setTab("chat");
                  notify(
                    "This is a demo concierge. No real host is connected.",
                  );
                }}
              >
                <MessageCircle size={21} />
                <span>Need a hand?</span>
                <small>We’re here for you</small>
              </button>
            </div>
            <div
              className="row"
              style={{
                justifyContent: "space-around",
                padding: "10px 0 20px",
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              <span>
                Check-in{" "}
                <strong style={{ color: "var(--ink)" }}>
                  {property.checkIn}
                </strong>
              </span>
              <span>
                Check-out{" "}
                <strong style={{ color: "var(--ink)" }}>
                  {property.checkOut}
                </strong>
              </span>
            </div>
            <div className="section-heading">
              <h2>All the little details</h2>
              <BookOpen size={16} color="#8e9a7e" />
            </div>
            {property.sections.map((section) => (
              <details className="guest-section" key={section.id}>
                <summary>
                  <GuideIcon name={section.icon} />
                  {section.title}
                  <ChevronRight size={15} />
                </summary>
                <div className="markdown">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
              </details>
            ))}
            <div
              className="card panel"
              style={{ background: "#edf1e5", marginTop: 22 }}
            >
              <div className="row">
                <Sparkles size={22} color="#7c906b" />
                <h3
                  style={{
                    fontFamily: "var(--serif)",
                    fontWeight: 800,
                    fontSize: 23,
                  }}
                >
                  A little help, whenever you need.
                </h3>
              </div>
              <p
                className="muted"
                style={{ fontSize: 12, margin: "12px 0 17px" }}
              >
                From finding the coffee to planning your checkout. Your guide
                has the answers.
              </p>
              <button className="text-link" onClick={() => setTab("chat")}>
                Meet your concierge
                <ChevronRight size={14} />
              </button>
            </div>
            {deferredInstall && (
              <button
                className="button secondary"
                style={{ width: "100%", marginTop: 20 }}
                onClick={async () => {
                  const event = deferredInstall as Event & {
                    prompt: () => Promise<void>;
                  };
                  await event.prompt();
                  setDeferredInstall(null);
                }}
              >
                <Download size={16} />
                Keep this guide on your home screen
              </button>
            )}
          </>
        )}
        {tab === "chat" && (
          <div className="guest-chat">
            <div className="guest-chat-header">
              <Sparkles size={30} />
              <h2>Your little local helper.</h2>
              <p>
                Ask about your stay at {property.name}.<br />
                I’ll find the answer in your guide.
              </p>
            </div>
            {!liveGuide && (
              <div className="notice">
                Demo concierge · Answers come from this sample guide in English.
                No host is contacted.
              </div>
            )}
            <div className="chat-messages" aria-live="polite">
              {messages.length === 0 && (
                <>
                  <div className="bubble">
                    Welcome! How can I help you settle in?
                  </div>
                  <div className="suggestions">
                    {[
                      "When is checkout?",
                      "How does the coffee machine work?",
                      "Where can I park?",
                    ].map((q) => (
                      <button key={q} onClick={() => ask(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {messages.map((m, i) => (
                <div
                  className={`bubble ${m.role === "user" ? "host" : ""}`}
                  key={i}
                >
                  <div className="markdown">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  {m.citations?.map((c) => (
                    <span className="citation" key={c}>
                      <BookOpen
                        size={10}
                        style={{ display: "inline", marginRight: 4 }}
                      />
                      From your guide · {c}
                    </span>
                  ))}
                  {m.role === "host" && (
                    <span className="citation">From your host</span>
                  )}
                  {m.escalate && (
                    <span className="citation">
                      {liveGuide
                        ? "Your host has been notified and will reply here"
                        : "Outside the sample guide · No host has been contacted"}
                    </span>
                  )}
                </div>
              ))}
              {busy && (
                <div className="bubble" role="status">
                  Finding that little detail…
                </div>
              )}
            </div>
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(message);
              }}
            >
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                aria-label="Ask your concierge"
                placeholder="Ask about your stay…"
              />
              <button
                className="button"
                aria-label="Send question"
                disabled={busy || !message.trim()}
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        )}
        {tab === "extras" && (
          <>
            <div className="guest-welcome">
              <h2>A little something extra.</h2>
              <p>
                Small comforts. Thoughtful touches.
                <br />
                Make this stay a little more yours.
              </p>
            </div>
            <div className="notice" style={{ marginBottom: 20 }}>
              Sample extras · No payment is taken and no reservation is made in
              this demo.
            </div>
            {property.extras.length ? (
              property.extras.map((extra) => (
                <article className="card guest-extra" key={extra.id}>
                  <span className="stat-icon">
                    <GuideIcon name={extra.icon} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3>{extra.name}</h3>
                    <p>{extra.description}</p>
                    <div className="row">
                      <strong>{money(extra.price)}</strong>
                      <button
                        className="button small"
                        onClick={() =>
                          liveGuide
                            ? setRequesting(extra)
                            : notify(
                                "Demo request only — nothing was sent or charged.",
                              )
                        }
                      >
                        {liveGuide ? "Request" : extra.approval ? "Request extra" : "Treat yourself"}
                        <ChevronRight size={12} />
                      </button>
                    </div>
                    {extra.approval && (
                      <small
                        style={{ display: "block", fontSize: 9, marginTop: 10 }}
                      >
                        Subject to your host’s approval
                      </small>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                <Gift size={30} />
                <h3>Lovely things are on their way.</h3>
                <p>Your host hasn’t added any extras yet.</p>
              </div>
            )}
          </>
        )}
        {requesting && (
          <form
            className="card"
            style={{ padding: 20, marginTop: 20 }}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const res = await fetch(`/api/v1/guides/${slug}/extras`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  extraId: requesting.id,
                  guestName: form.get("guestName"),
                  guestContact: form.get("guestContact"),
                  note: form.get("note") || "",
                }),
              });
              const body = await res.json().catch(() => ({}));
              if (res.ok && body.checkoutUrl) {
                notify("Opening secure checkout…");
                location.assign(body.checkoutUrl);
              } else if (res.ok) {
                setRequesting(null);
                notify(body.note || "Request sent! Your host will confirm and explain how to pay.");
              } else notify(body.error || "Couldn’t send your request. Please try again.");
            }}
          >
            <h3>Request: {requesting.name} · {money(requesting.price)}</h3>
            <p style={{ fontSize: 12 }}>
              If your host accepts online payment you’ll continue to secure checkout (card, Apple Pay or Google Pay).
              Extras that need your host’s approval are only charged once they confirm.
            </p>
            <label style={{ display: "block", marginTop: 10 }}>
              Your name
              <input name="guestName" required minLength={2} maxLength={120} autoComplete="name" />
            </label>
            <label style={{ display: "block", marginTop: 10 }}>
              Email or phone
              <input name="guestContact" required minLength={5} maxLength={200} autoComplete="email" />
            </label>
            <label style={{ display: "block", marginTop: 10 }}>
              Note for your host (optional)
              <input name="note" maxLength={1000} placeholder="e.g. We land at 9 AM" />
            </label>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="button">Continue</button>
              <button type="button" className="button secondary" onClick={() => setRequesting(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
        <p
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "var(--muted)",
            marginTop: 30,
          }}
        >
          A thoughtful stay, brought to you by{" "}
          <Link href="/" style={{ color: "var(--teal)" }}>
            stayguide.
          </Link>
        </p>
      </main>
      <nav className="guest-nav" aria-label="Guest guide navigation">
        {[
          { id: "guide", label: "Your stay", Icon: BookOpen },
          { id: "chat", label: "Concierge", Icon: Sparkles },
          { id: "extras", label: "Little extras", Icon: Gift },
        ].map(({ id, label, Icon }) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => {
              setTab(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Icon size={21} strokeWidth={1.6} />
            {label}
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
