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
import { applyGuideText, demoAnswer, demoProperties, languages, mapsUrl, money, type GuideText, type Property, type PublicProperty } from "@stayguide/shared";
import { useDemo } from "@/lib/demo-store";
import { fill, guestText, isRtl } from "@/lib/guest-i18n";
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
  initial?: PublicProperty | null;
}) {
  const state = useDemo();
  const liveGuide = Boolean(initial);
  const original = initial ?? state.properties.find((p) => p.slug === slug);
  const sample = !liveGuide && Boolean(original && demoProperties.some((p) => p.slug === slug));
  const [tab, setTab] = useState("guide");
  const [language, setLanguage] = useState("en");
  const [translation, setTranslation] = useState<{ language: string; text: GuideText } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const t = guestText(language);
  const rtl = isRtl(language);
  const translated = Boolean(translation && translation.language === language && !showOriginal);
  const base = original && translated ? applyGuideText(original, translation!.text) : original;
  // Host set a stay code and we haven't unlocked wifiPassword/hostPhone for this device yet.
  const locked = Boolean(base && "locked" in base && base.locked);
  const [unlocked, setUnlocked] = useState<{ code: string; wifiPassword: string; hostPhone: string } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const property = base && unlocked ? { ...base, wifiPassword: unlocked.wifiPassword, hostPhone: unlocked.hostPhone } : base;
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
  // Re-apply a previously entered stay code so a returning guest isn't asked again mid-stay.
  useEffect(() => {
    if (!liveGuide) return;
    try {
      const saved = localStorage.getItem(`stayguide-unlock-${slug}`);
      if (saved) queueMicrotask(() => setUnlocked(JSON.parse(saved)));
    } catch {
      /* storage unavailable */
    }
  }, [liveGuide, slug]);
  async function unlock(code: string) {
    if (!code.trim() || unlocking) return;
    setUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch(`/api/v1/guides/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setUnlockError(t.unlockError);
        return;
      }
      const fields = { code: code.trim(), wifiPassword: body.wifiPassword as string, hostPhone: body.hostPhone as string };
      setUnlocked(fields);
      setCodeInput("");
      try {
        localStorage.setItem(`stayguide-unlock-${slug}`, JSON.stringify(fields));
      } catch {
        /* storage full */
      }
    } catch {
      setUnlockError(t.unavailable);
    } finally {
      setUnlocking(false);
    }
  }
  // Guide content in the guest's language: AI translation from the server, cached per guide version.
  useEffect(() => {
    if (!(liveGuide || sample)) return;
    let cancelled = false;
    const cacheKey = `stayguide-translation-${slug}-${language}`;
    queueMicrotask(() => {
      if (cancelled) return;
      setShowOriginal(false);
      try {
        const saved = localStorage.getItem(cacheKey);
        if (saved) {
          setTranslation({ language, text: JSON.parse(saved) as GuideText });
          return;
        }
      } catch {
        /* storage unavailable */
      }
      setTranslating(true);
      fetch(`/api/v1/guides/${slug}/translation?lang=${language}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body: { translated?: boolean; text?: GuideText } | null) => {
          if (cancelled) return;
          if (body?.translated && body.text) {
            setTranslation({ language, text: body.text });
            try {
              localStorage.setItem(cacheKey, JSON.stringify(body.text));
            } catch {
              /* storage full */
            }
          } else setTranslation(null);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setTranslating(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [liveGuide, sample, slug, language]);
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
        const text = guestText(localStorage.getItem("stayguide-language") || navigator.language.split("-")[0]);
        setToast(extra === "success" ? text.paid : text.paymentCancelled);
        setTimeout(() => setToast(""), 7000);
      });
      history.replaceState(null, "", location.pathname);
    }
    // The guest's saved choice, otherwise the phone's language.
    const preferred = localStorage.getItem("stayguide-language") || navigator.language.split("-")[0];
    if (languages.includes(preferred as (typeof languages)[number]))
      queueMicrotask(() => setLanguage(preferred));
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const install = (event: Event) => {
      event.preventDefault();
      setDeferredInstall(event);
    };
    window.addEventListener("beforeinstallprompt", install);
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
      if (liveGuide && !navigator.onLine) {
        answer = { answer: t.chatOffline, citations: [], escalate: false };
      } else if (liveGuide) {
        const res = await fetch(`/api/v1/guides/${slug}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, language, ...(threadId ? { threadId } : {}), ...(unlocked ? { accessCode: unlocked.code } : {}) }),
        });
        const body = await res.json();
        if (!res.ok) {
          answer = {
            answer: body.error || t.unavailable,
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
        answer = demoAnswer(property, text, language);
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
    } catch {
      // Lost connection mid-question: say so instead of leaving the guest waiting.
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: navigator.onLine ? t.unavailable : t.chatOffline,
          citations: [],
          escalate: false,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  if (!property)
    return (
      <div className="guest-page" dir={rtl ? "rtl" : "ltr"} lang={language}>
        <div className="guest-body">
          <Logo />
          <div className="empty">
            <BookOpen size={32} />
            <h2>{t.notFoundTitle}</h2>
            <p>{t.notFoundBody}</p>
            <Link className="button" href="/demo">
              {t.exploreSample}
            </Link>
          </div>
        </div>
      </div>
    );
  return (
    <div className="guest-page" dir={rtl ? "rtl" : "ltr"} lang={language}>
      {offline && <div className="offline-banner">{t.offline}</div>}
      <div className="guest-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={property.image} alt={property.name} fetchPriority="high" />
        <div className="guest-top">
          <Logo light />
          <select
            aria-label={t.languageLabel}
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              try {
                localStorage.setItem("stayguide-language", e.target.value);
              } catch {
                /* private browsing */
              }
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
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{property.name}</h1>
          <p>
            <MapPin size={12} style={{ display: "inline", marginInlineEnd: 5 }} />
            {property.location}
          </p>
        </div>
      </div>
      <main className="guest-body">
        {tab === "guide" && (
          <>
            <div className="guest-welcome">
              <h2>{t.welcome}</h2>
              <p>{property.description}</p>
              {(translating || translation?.language === language) && (
                <p className="translation-note" role="status">
                  {translating ? (
                    t.translating
                  ) : (
                    <>
                      {showOriginal ? null : <span>{t.translated} · </span>}
                      <button type="button" onClick={() => setShowOriginal((v) => !v)}>
                        {showOriginal ? t.showTranslation : t.showOriginal}
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="guest-quick">
              <button
                onClick={async () => {
                  if (locked) {
                    notify(t.unlockTitle);
                    return;
                  }
                  if (!property.wifiPassword) {
                    notify(t.wifiAsk);
                    return;
                  }
                  try {
                    await navigator.clipboard.writeText(property.wifiPassword);
                    notify(fill(t.wifiCopied, { network: property.wifi }));
                  } catch {
                    notify(fill(t.wifiShow, { network: property.wifi, password: property.wifiPassword }));
                  }
                }}
              >
                <Wifi size={21} />
                <span>{t.wifi}</span>
                <small>{t.wifiTap}</small>
              </button>
              <a
                href={mapsUrl(property)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={21} />
                <span>{t.findWay}</span>
                <small>{t.openMaps}</small>
              </a>
              <button
                onClick={() => {
                  setTab("chat");
                  if (!liveGuide) notify(t.demoConcierge);
                }}
              >
                <MessageCircle size={21} />
                <span>{t.needHand}</span>
                <small>{t.hereForYou}</small>
              </button>
            </div>
            {locked && (
              <div className="card" style={{ margin: "0 20px 20px" }}>
                <strong style={{ display: "block", marginBottom: 4 }}>{t.unlockTitle}</strong>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>{t.unlockBody}</p>
                <form
                  className="row"
                  style={{ gap: 8 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void unlock(codeInput);
                  }}
                >
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder={t.unlockPlaceholder}
                    maxLength={40}
                    style={{ flex: 1 }}
                  />
                  <button className="button" type="submit" disabled={unlocking || !codeInput.trim()}>
                    {t.unlockButton}
                  </button>
                </form>
                {unlockError && (
                  <p className="notice" style={{ marginTop: 8 }} role="alert">
                    {unlockError}
                  </p>
                )}
              </div>
            )}
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
                {t.checkIn}{" "}
                <strong style={{ color: "var(--ink)" }}>
                  {property.checkIn}
                </strong>
              </span>
              <span>
                {t.checkOut}{" "}
                <strong style={{ color: "var(--ink)" }}>
                  {property.checkOut}
                </strong>
              </span>
            </div>
            <div className="section-heading">
              <h2>{t.details}</h2>
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
                  {t.helpTitle}
                </h3>
              </div>
              <p
                className="muted"
                style={{ fontSize: 12, margin: "12px 0 17px" }}
              >
                {t.helpBody}
              </p>
              <button className="text-link" onClick={() => setTab("chat")}>
                {t.meetConcierge}
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
                {t.install}
              </button>
            )}
          </>
        )}
        {tab === "chat" && (
          <div className="guest-chat">
            <div className="guest-chat-header">
              <Sparkles size={30} />
              <h2>{t.chatTitle}</h2>
              <p>
                {fill(t.chatIntro, { name: property.name })}
                <br />
                {t.chatIntro2}
              </p>
            </div>
            {!liveGuide && (
              <div className="notice">{t.demoNotice}</div>
            )}
            <div className="chat-messages" aria-live="polite">
              {messages.length === 0 && (
                <>
                  <div className="bubble">{t.chatWelcome}</div>
                  <div className="suggestions">
                    {t.suggestions.map((q) => (
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
                        style={{ display: "inline", marginInlineEnd: 4 }}
                      />
                      {t.fromGuide} · {c}
                    </span>
                  ))}
                  {m.role === "host" && (
                    <span className="citation">{t.fromHost}</span>
                  )}
                  {m.escalate && (
                    <span className="citation">
                      {liveGuide ? t.notified : t.outsideSample}
                    </span>
                  )}
                </div>
              ))}
              {busy && (
                <div className="bubble" role="status">
                  {t.thinking}
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
                aria-label={t.askLabel}
                placeholder={t.askPlaceholder}
              />
              <button
                className="button"
                aria-label={t.send}
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
              <h2>{t.extrasTitle}</h2>
              <p>
                {t.extrasBody1}
                <br />
                {t.extrasBody2}
              </p>
            </div>
            {!liveGuide && (
              <div className="notice" style={{ marginBottom: 20 }}>
                {t.sampleExtras}
              </div>
            )}
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
                            : notify(t.demoRequest)
                        }
                      >
                        {liveGuide ? t.request : extra.approval ? t.requestExtra : t.treat}
                        <ChevronRight size={12} />
                      </button>
                    </div>
                    {extra.approval && (
                      <small
                        style={{ display: "block", fontSize: 9, marginTop: 10 }}
                      >
                        {t.approval}
                      </small>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                <Gift size={30} />
                <h3>{t.noExtrasTitle}</h3>
                <p>{t.noExtrasBody}</p>
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
                notify(t.openingCheckout);
                location.assign(body.checkoutUrl);
              } else if (res.ok) {
                setRequesting(null);
                notify(body.note || t.requestSent);
              } else notify(body.error || t.requestFailed);
            }}
          >
            <h3>
              {t.requestTitle}: {(property.extras.find((e) => e.id === requesting.id) ?? requesting).name} ·{" "}
              {money(requesting.price)}
            </h3>
            <p style={{ fontSize: 12 }}>{t.requestHelp}</p>
            <label style={{ display: "block", marginTop: 10 }}>
              {t.yourName}
              <input name="guestName" required minLength={2} maxLength={120} autoComplete="name" />
            </label>
            <label style={{ display: "block", marginTop: 10 }}>
              {t.contact}
              <input name="guestContact" required minLength={5} maxLength={200} autoComplete="email" />
            </label>
            <label style={{ display: "block", marginTop: 10 }}>
              {t.note}
              <input name="note" maxLength={1000} placeholder={t.notePlaceholder} />
            </label>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="button">{t.continue}</button>
              <button type="button" className="button secondary" onClick={() => setRequesting(null)}>
                {t.cancel}
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
          {t.footer}{" "}
          <Link href="/" style={{ color: "var(--teal)" }}>
            stayguide.
          </Link>
        </p>
      </main>
      <nav className="guest-nav" aria-label={t.navLabel}>
        {[
          { id: "guide", label: t.navStay, Icon: BookOpen },
          { id: "chat", label: t.navConcierge, Icon: Sparkles },
          { id: "extras", label: t.navExtras, Icon: Gift },
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
