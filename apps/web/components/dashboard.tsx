"use client";
/* Demo data is deliberately isolated from authenticated production APIs. */
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  Eye,
  Gift,
  GripVertical,
  Home,
  Leaf,
  Lightbulb,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Plus,
  QrCode,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Wifi,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import QRCode from "qrcode";
import {
  demoProperties,
  sections,
  money,
  plans,
  priceFor,
  propertySchema,
  type Property,
  type Section,
  CURRENCY,
  CURRENCY_SYMBOL,
  selfServePlans,
} from "@stayguide/shared";
import {
  useDemo,
  updateDemo,
  saveProperty,
  useLive,
  initLive,
  createLiveProperty,
  deleteLiveProperty,
} from "@/lib/demo-store";
import { parseManual, extractWifi, extractTime } from "@/lib/guide-parser";
import { LiveInbox, LiveExtraRequests, LiveAnalytics, LiveBilling } from "./live";
import { HotelPlanCard } from "./hotel-plan";
import { AppLanguageMenu, useAppLocale } from "./app-locale";
import { siteDir, siteText } from "@/lib/site-i18n";
import { signOutAction } from "@/app/actions";
import { Logo, PageHeading, GuideIcon, Empty } from "./ui";
import { Modal } from "./modal";
const nav = [
  ["", "Overview", Home],
  ["properties", "Properties", BookOpen],
  ["inbox", "Guest inbox", MessageCircle],
  ["extras", "Extras & upsells", Gift],
  ["analytics", "Analytics", BarChart3],
] as const;
const secondNav = [
  ["share", "Share kit", QrCode],
  ["billing", "Plans & billing", CreditCard],
  ["settings", "Settings", Settings],
] as const;
const threads = [
  {
    id: "sarah",
    name: "Sarah Mitchell",
    property: "Casa Serena",
    message: "Is it possible to leave our bags after checkout tomorrow?",
    time: "12 min ago",
    initials: "SM",
  },
  {
    id: "james",
    name: "James Wilson",
    property: "The Olive Grove",
    message: "Could you recommend somewhere for our anniversary dinner?",
    time: "38 min ago",
    initials: "JW",
  },
];
export function Dashboard({ view = "" }: { view?: string }) {
  const state = useDemo();
  const { locale, tr } = useAppLocale();
  const liveState = useLive();
  const live = liveState.live;
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    void initLive();
  }, []);
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState<"property" | "extra" | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const selected = state.selectedProperty;
  const setSelected = (id: string) => updateDemo({ selectedProperty: id });
  const [sectionId, setSectionId] = useState("arrival");
  const [editPreview, setEditPreview] = useState(false);
  const [thread, setThread] = useState(threads[0]);
  const [reply, setReply] = useState("");
  const [qr, setQr] = useState("");
  const [yearly, setYearly] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const property =
    state.properties.find((p) => p.id === selected) || state.properties[0];
  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 4000);
  };
  const close = useCallback(() => {
    setModal(null);
    setError("");
  }, []);
  const title =
    tr([...nav, ...secondNav].find((n) => n[0] === view)?.[1] || "Guide editor");
  const currentSection =
    property?.sections.find((s) => s.id === sectionId) || property?.sections[0];
  const updateSection = (patch: Partial<Section>) => {
    if (property && currentSection)
      saveProperty({
        ...property,
        sections: property.sections.map((s) =>
          s.id === currentSection.id ? { ...s, ...patch } : s,
        ),
      });
  };
  async function createProperty(form: FormData) {
    const result = propertySchema.safeParse({
      name: form.get("name"),
      location: form.get("location"),
      address: form.get("address") ?? "",
      description: form.get("description"),
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (live) {
      setCreating(true);
      try {
        const { ai } = await createLiveProperty(result.data);
        close();
        notify(
          ai
            ? tr("Property created. AI organized your guide — have a look.")
            : tr("Property created. Your guide is ready to edit."),
        );
        router.push("/dashboard/editor");
      } catch (e) {
        setError(e instanceof Error ? e.message : tr("Could not create the property."));
      } finally {
        setCreating(false);
      }
      return;
    }
    const id = crypto.randomUUID();
    const slug =
      result.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      id.slice(0, 6);
    const manual = result.data.description;
    const next: Property = {
      ...demoProperties[0],
      ...result.data,
      id,
      slug,
      status: "draft",
      wifi: extractWifi(manual).network,
      wifiPassword: extractWifi(manual).password,
      checkIn: extractTime(manual, "in") || demoProperties[0].checkIn,
      checkOut: extractTime(manual, "out") || demoProperties[0].checkOut,
      hostPhone: "",
      sections: manual
        ? parseManual(manual)
        : sections.map((s) => ({
            ...s,
            body: tr("Add your property’s {type} information here.", { type: s.type }),
          })),
      extras: [],
    };
    saveProperty(next);
    setSelected(id);
    close();
    notify(tr("Property created. Your guide is ready to edit."));
    router.push("/dashboard/editor");
  }
  const stats = [
    {
      label: tr("Guide views"),
      value: "1,284",
      foot: "+18.6%",
      detail: tr("vs. previous month"),
      icon: Eye,
    },
    {
      label: tr("AI conversations"),
      value: "342",
      foot: "94%",
      detail: tr("answered without you"),
      icon: MessageCircle,
    },
    {
      label: tr("Extras revenue"),
      value: `${CURRENCY_SYMBOL}486`,
      foot: "+24.2%",
      detail: tr("vs. previous month"),
      icon: Gift,
    },
    {
      label: tr("Happy guests"),
      value: "98%",
      foot: "4.9 / 5",
      detail: tr("average guest rating"),
      icon: HeartIcon,
    },
  ];
  const propertyCards = state.properties.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (p.name + " " + p.location).toLowerCase().includes(search.toLowerCase()),
  );
  const cards = (
    <div className="property-grid">
      {propertyCards.map((p, i) => (
        <article className="card property-card" key={p.id}>
          <div className="property-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image}
              alt={tr("{name}, a welcoming holiday home", { name: p.name })}
              loading="lazy"
            />
            <span className={`pill ${p.status === "draft" ? "amber" : ""}`}>
              {p.status === "published" ? tr("Published") : tr("Draft")}
            </span>
            <button
              aria-label={tr("Edit {name}", { name: p.name })}
              className="photo-menu"
              onClick={() => {
                setSelected(p.id);
                router.push("/dashboard/editor");
              }}
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="property-body">
            <div className="property-title">
              <h3>{p.name}</h3>
              <Link aria-label={tr("Preview {name}", { name: p.name })} href={`/g/${p.slug}`}>
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="location">
              <MapPin size={11} />
              {p.location}
            </div>
            <div className="property-meta">
              <span>
                <BookOpen size={12} />
                {tr("{n} sections", { n: p.sections.length })}
              </span>
              <span>
                <Eye size={12} />
                {tr("{n} demo views", { n: i < 2 ? [842, 442][i] : 0 })}
              </span>
              <span>
                <MessageCircle size={12} />
                {tr("{n} chats", { n: i < 2 ? [218, 124][i] : 0 })}
              </span>
            </div>
            <div className="property-bottom">
              <small>{tr("Made with a little extra care")}</small>
              <div className="row">
                <button
                  className="icon-button"
                  aria-label={tr("Share {name}", { name: p.name })}
                  onClick={() => {
                    setSelected(p.id);
                    router.push("/dashboard/share");
                  }}
                >
                  <QrCode size={13} />
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setSelected(p.id);
                    router.push("/dashboard/editor");
                  }}
                >
                  {tr("Edit guide")}
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
  return (
    <div
      className={`app-shell ${state.dark ? "theme-dark" : ""}`}
      lang={locale}
      dir={siteDir(locale)}
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="row">
          <Logo />
          {mobile && (
            <button
              className="icon-button"
              aria-label={tr("Close navigation")}
              onClick={() => setMobile(false)}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="workspace">
          <div className="workspace-icon">
            <Home size={16} />
          </div>
          <div>
            <strong>{state.organization}</strong>
            <small>{tr("Host workspace")}</small>
          </div>
          <ChevronDown size={12} />
        </div>
        <div className="nav-label">{tr("WORKSPACE")}</div>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <Link
              key={path}
              href={`/dashboard${path ? "/" + path : ""}`}
              onClick={() => setMobile(false)}
              className={`nav-item ${view === path ? "active" : ""}`}
            >
              <Icon size={17} strokeWidth={1.6} />
              {tr(label)}
              {path === "inbox" && !live && <span className="badge">2</span>}
            </Link>
          ))}
        </nav>
        <div className="nav-divider" />
        <nav>
          {secondNav.map(([path, label, Icon]) => (
            <Link
              key={path}
              href={`/dashboard/${path}`}
              onClick={() => setMobile(false)}
              className={`nav-item ${view === path ? "active" : ""}`}
            >
              <Icon size={17} strokeWidth={1.6} />
              {tr(label)}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <Sparkles size={18} color="#8a9b6c" />
            <h3>{tr("A little more possibility.")}</h3>
            <p>
              {tr("More properties. More AI answers.")}
              <br />
              {tr("Even better guest experiences.")}
            </p>
            <Link className="button cream" href="/dashboard/billing">
              {tr("Explore Pro")}
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <Link href="/dashboard/settings" className="sidebar-user">
            <span className="avatar">
              {live && liveState.user
                ? (liveState.user.name || liveState.user.email).slice(0, 2).toUpperCase()
                : `${state.hostName.slice(0, 1)}M`}
            </span>
            <div>
              <strong>{live && liveState.user ? liveState.user.name || liveState.user.email : `${state.hostName} Morgan`}</strong>
              <br />
              <small>{live ? tr("Workspace owner") : tr("Demo host account")}</small>
            </div>
            <ChevronDown size={12} style={{ marginInlineStart: "auto" }} />
          </Link>
        </div>
      </aside>
      <div className="dashboard-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label={tr("Open navigation")}
              onClick={() => setMobile(true)}
            >
              <Menu size={17} />
            </button>
            <span>{tr("Workspace")}</span>
            <ChevronRight size={12} />
            <span style={{ color: "var(--ink)" }}>{title}</span>
          </div>
          <div className="topbar-right">
            {live ? (
              <span className="demo-badge" role="status">
                {liveState.sync === "saving"
                  ? tr("SAVING…")
                  : liveState.sync === "error"
                    ? tr("NOT SAVED · RETRYING ON NEXT EDIT")
                    : tr("ALL CHANGES SAVED")}
              </span>
            ) : (
              <>
                <span className="demo-badge">{tr("DEMO WORKSPACE")}</span>
                {liveState.services.accounts && (
                  <Link href="/login">{tr("Sign in")}</Link>
                )}
              </>
            )}
            <AppLanguageMenu compact />
            <Link href="/demo">
              {tr("View guest experience")}
              <ArrowUpRight
                size={12}
                style={{ display: "inline", marginInlineStart: 5 }}
              />
            </Link>
            <button
              aria-label={tr("Toggle dark mode")}
              onClick={() => updateDemo({ dark: !state.dark })}
            >
              {state.dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link aria-label={tr("Guest notifications")} href="/dashboard/inbox">
              <Bell size={17} />
            </Link>
            {live && liveState.user ? (
              <form action={signOutAction}>
                <button
                  className="avatar"
                  title={tr("Signed in as {email}. Click to sign out.", { email: liveState.user.email })}
                  aria-label={tr("Sign out {email}", { email: liveState.user.email })}
                >
                  {(liveState.user.name || liveState.user.email).slice(0, 2).toUpperCase()}
                </button>
              </form>
            ) : (
              <span className="avatar">AM</span>
            )}
          </div>
        </header>
        <main className="dashboard-content">
          {view === "" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {tr("YOUR LITTLE HOSTING HEADQUARTERS")}
                  </div>
                  <h1 className="welcome-title">
                    {tr("Good things start with a")} <span>{tr("great stay.")}</span>
                  </h1>
                  <p>
                    {tr("Welcome back, {name}. Here’s how your properties are doing.", {
                      name: live && liveState.user ? (liveState.user.name || liveState.user.email).split(" ")[0] : state.hostName,
                    })}
                  </p>
                </div>
                <span className="button secondary date-button">
                  <CalendarDays size={13} />
                  {tr("Demo month")}
                  <ChevronDown size={12} />
                </span>
              </div>
              <section className="hero-banner">
                <div className="hero-banner-copy">
                  <div className="eyebrow">{tr("LESS MANAGING. MORE HOSTING.")}</div>
                  <h2>
                    {tr("A thoughtful stay,")}
                    <br />
                    {tr("without the extra work.")}
                  </h2>
                  <p>
                    {tr("Your guides handle the little questions.")}
                    <br />
                    {tr("You focus on making guests feel at home.")}
                  </p>
                  <button
                    className="button"
                    onClick={() => setModal("property")}
                  >
                    <Plus size={13} />
                    {tr("Create a guide")}
                    <ArrowUpRight size={12} />
                  </button>
                </div>
                <div className="hero-art">
                  <div className="mini-phone">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={demoProperties[0].image}
                      alt="Casa Serena guest guide preview"
                    />
                    <div className="mini-copy">
                      <small>{tr("YOUR HOME AWAY FROM HOME")}</small>
                      <br />
                      <strong>{tr("Olá, welcome home.")}</strong>
                      <div className="mini-grid">
                        <span>
                          <Wifi size={10} />
                          {tr("Wi-Fi")}
                        </span>
                        <span>
                          <MapPin size={10} />
                          {tr("Explore")}
                        </span>
                        <span>
                          <BookOpen size={10} />
                          {tr("Your stay")}
                        </span>
                        <span>
                          <Gift size={10} />
                          {tr("Little extras")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="floating-chip">
                    <CheckCheck size={20} />
                    <div>
                      <strong>{tr("Happy guests. Happy host.")}</strong>
                      <small>{tr("Thoughtful details, all in one place.")}</small>
                    </div>
                  </div>
                </div>
              </section>
              <div className="stats-grid">
                {stats.map(({ label, value, foot, detail, icon: Icon }) => (
                  <div className="card stat-card" key={label}>
                    <div className="stat-top">
                      {label}
                      <span className="stat-icon">
                        <Icon size={15} />
                      </span>
                    </div>
                    <div className="stat-value">{value}</div>
                    <div className="stat-foot">
                      <TrendingUp size={11} />
                      <em>{foot}</em>
                      <span>{detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-heading">
                <h2>
                  {tr("Your properties")}{" "}
                  <small>
                    {tr("{n} little places. Endless possibilities.", { n: state.properties.length })}
                  </small>
                </h2>
                <Link className="text-link" href="/dashboard/properties">
                  {tr("View all properties")}
                  <ArrowRight size={13} />
                </Link>
              </div>
              {cards}
              <div className="bottom-grid">
                <section className="card panel">
                  <div className="panel-title">
                    <h2>{tr("Around your properties")}</h2>
                    <Link className="text-link" href="/dashboard/inbox">
                      {tr("View inbox")}
                      <ArrowUpRight size={12} />
                    </Link>
                  </div>
                  {[
                    {
                      icon: Gift,
                      title: tr("A slower goodbye, booked."),
                      detail: "Casa Serena · " + tr("Late checkout") + " · " + CURRENCY_SYMBOL + "35",
                      time: tr("12 min ago"),
                    },
                    {
                      icon: MessageCircle,
                      title: tr("One less question on your plate."),
                      detail: "The Olive Grove · " + tr("Wi-Fi details shared by concierge"),
                      time: tr("34 min ago"),
                    },
                    {
                      icon: BookOpen,
                      title: tr("A warm welcome, delivered."),
                      detail: "Casa Serena · " + tr("A guest opened their guide"),
                      time: tr("1 hour ago"),
                    },
                  ].map(({ icon: Icon, title, detail, time }) => (
                    <div className="activity-item" key={title}>
                      <span className="activity-icon">
                        <Icon size={16} />
                      </span>
                      <div className="activity-copy">
                        <p>{title}</p>
                        <small>{detail}</small>
                      </div>
                      <time>{time}</time>
                    </div>
                  ))}
                </section>
                <section className="card panel tip-panel">
                  <div className="eyebrow">
                    <Lightbulb size={14} />
                    {tr("A LITTLE HOSTING INSPIRATION")}
                  </div>
                  <h3>
                    {tr("Small extras.")}
                    <br />
                    {tr("Memorable experiences.")}
                  </h3>
                  <p>
                    {tr("A late checkout. A local breakfast.")}
                    <br />
                    {tr("Turn thoughtful touches into extra income, and give guests a stay to remember.")}
                  </p>
                  <Link href="/dashboard/extras" className="text-link">
                    {tr("Explore your extras")}
                    <ArrowRight size={13} />
                  </Link>
                  <Leaf className="tip-leaf" size={105} strokeWidth={0.7} />
                </section>
              </div>
            </>
          )}
          {view === "properties" && (
            <>
              <PageHeading
                title={tr("Your properties")}
                description={tr("Beautiful places deserve a thoughtful welcome.")}
              >
                <button className="button" onClick={() => setModal("property")}>
                  <Plus size={16} />
                  {tr("Add property")}
                </button>
              </PageHeading>
              {state.properties.some((p) => p.autoUnpublished) && (
                <div className="notice" style={{ marginBottom: 16 }}>
                  {tr(
                    "Your plan changed and no longer covers every property, so we moved {n} of them to drafts (the most recently edited ones stayed published). Upgrade your plan or republish the ones you want live from each property's editor.",
                    { n: state.properties.filter((p) => p.autoUnpublished).length },
                  )}
                </div>
              )}
              <div className="filter-bar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label={tr("Search properties")}
                    placeholder={tr("Find a little place…")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="tabs">
                  {["all", "published", "draft"].map((f) => (
                    <button
                      className={filter === f ? "active" : ""}
                      onClick={() => setFilter(f)}
                      key={f}
                    >
                      {f === "all" ? tr("All") : f === "published" ? tr("Published") : tr("Draft")}
                    </button>
                  ))}
                </div>
              </div>
              {propertyCards.length ? (
                cards
              ) : (
                <Empty
                  title={tr("No properties here yet")}
                  description={tr("Create a property or try another search.")}
                >
                  <button
                    className="button"
                    onClick={() => setModal("property")}
                  >
                    {tr("Add a property")}
                  </button>
                </Empty>
              )}
            </>
          )}
          {view === "editor" && property && (
            <>
              <PageHeading
                title={property.name}
                description={tr("A little local knowledge goes a long way.")}
              >
                <Link className="button secondary" href={`/g/${property.slug}`}>
                  <Eye size={15} />
                  {tr("Guest preview")}
                </Link>
                {live && (
                  <button
                    className="button secondary"
                    onClick={async () => {
                      if (!confirm(tr("Delete {name} and its guide? This cannot be undone.", { name: property.name }))) return;
                      try {
                        await deleteLiveProperty(property.id);
                        notify(tr("Property deleted."));
                        router.push("/dashboard/properties");
                      } catch {
                        notify(tr("Couldn’t delete the property. Please try again."));
                      }
                    }}
                  >
                    {tr("Delete")}
                  </button>
                )}
              </PageHeading>
              {property.autoUnpublished && (
                <div className="notice" style={{ marginBottom: 16 }}>
                  {tr("This guide was moved to draft because your plan no longer covers it. Republish it below once you’ve upgraded or freed up a slot.")}
                </div>
              )}
              <div className="filter-bar">
                <select
                  aria-label={tr("Select property to edit")}
                  style={{ maxWidth: 270 }}
                  value={property.id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setSectionId("arrival");
                  }}
                >
                  {state.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="row">
                  {!live && (
                    <span className="muted" style={{ fontSize: 11 }}>
                      {tr("Saved on this device")}
                    </span>
                  )}
                  <button
                    className="button small"
                    onClick={() => {
                      saveProperty({
                        ...property,
                        status:
                          property.status === "published"
                            ? "draft"
                            : "published",
                      });
                      notify(
                        property.status === "published"
                          ? tr("Guide moved to draft.")
                          : live
                            ? tr("Guide published. Guests can open it now.")
                            : tr("Demo guide published on this device."),
                      );
                    }}
                  >
                    {property.status === "published"
                      ? tr("Unpublish")
                      : tr("Publish guide")}
                  </button>
                </div>
              </div>
              <div className="card property-details">
                <div className="property-details-head">
                  <h3>{tr("Property details")}</h3>
                  <small className="muted">
                    {tr("Shown to guests and used by the concierge. Changes save automatically.")}
                  </small>
                </div>
                <div className="property-details-grid">
                  {(
                    [
                      ["address", "Street address", "e.g. 123 Ridge Road, Gatlinburg, TN 37738", 300],
                      ["location", "City, country", "e.g. Gatlinburg, Tennessee", 200],
                      ["checkIn", "Check-in time", "e.g. 4:00 PM", 40],
                      ["checkOut", "Checkout time", "e.g. 10:00 AM", 40],
                      ["wifi", "Wi-Fi network", "e.g. SmokyRidge_Guest", 120],
                      ["wifiPassword", "Wi-Fi password", "e.g. bearden2026", 120],
                      ["hostPhone", "Host phone", "e.g. +1 865 555 0100", 40],
                      ["accessCode", "Private stay code (optional)", "e.g. 4821", 40],
                    ] as const
                  ).map(([field, label, placeholder, max]) => (
                    <label key={field} className={field === "address" ? "wide" : ""}>
                      {tr(label)}
                      {field === "accessCode" && (
                        <small className="muted" style={{ display: "block", fontWeight: 400 }}>
                          {tr("When set, guests must enter this code before the Wi-Fi password and your phone number are shown.")}
                        </small>
                      )}
                      <input
                        value={property[field] ?? ""}
                        placeholder={placeholder}
                        maxLength={max}
                        onChange={(e) => saveProperty({ ...property, [field]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="editor-grid">
                <div className="card section-list">
                  {property.sections.map((s) => (
                    <button
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", s.id)
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("text/plain");
                        const items = [...property.sections];
                        const from = items.findIndex((x) => x.id === id),
                          to = items.findIndex((x) => x.id === s.id);
                        if (from >= 0) {
                          items.splice(to, 0, items.splice(from, 1)[0]);
                          saveProperty({ ...property, sections: items });
                        }
                      }}
                      className={s.id === currentSection?.id ? "active" : ""}
                      key={s.id}
                      onClick={() => setSectionId(s.id)}
                    >
                      <GripVertical size={12} />
                      <GuideIcon name={s.icon} size={15} />
                      {s.title}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const id = crypto.randomUUID();
                      saveProperty({
                        ...property,
                        sections: [
                          ...property.sections,
                          {
                            id,
                            type: "custom",
                            title: tr("A new little detail"),
                            body: "",
                            icon: "book",
                          },
                        ],
                      });
                      setSectionId(id);
                    }}
                  >
                    <Plus size={15} />
                    {tr("Add section")}
                  </button>
                </div>
                <div className="card section-editor">
                  {currentSection && (
                    <>
                      <div className="filter-bar">
                        <h3>{tr("Make it feel like you.")}</h3>
                        <div className="tabs">
                          <button
                            className={!editPreview ? "active" : ""}
                            onClick={() => setEditPreview(false)}
                          >
                            {tr("Write")}
                          </button>
                          <button
                            className={editPreview ? "active" : ""}
                            onClick={() => setEditPreview(true)}
                          >
                            {tr("Preview")}
                          </button>
                        </div>
                      </div>
                      {editPreview ? (
                        <div className="markdown">
                          <h2>{currentSection.title}</h2>
                          <ReactMarkdown>{currentSection.body}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="form-grid">
                          <label>
                            {tr("Section title")}
                            <input
                              value={currentSection.title}
                              onChange={(e) =>
                                updateSection({ title: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            {tr("Icon")}
                            <select
                              value={currentSection.icon}
                              onChange={(e) =>
                                updateSection({ icon: e.target.value })
                              }
                            >
                              {[
                                "key",
                                "wifi",
                                "heart",
                                "coffee",
                                "car",
                                "leaf",
                                "sun",
                                "shield",
                                "map",
                                "book",
                              ].map((i) => (
                                <option key={i}>{i}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {tr("Your local knowledge")}
                            <textarea
                              rows={12}
                              value={currentSection.body}
                              placeholder={tr("All the details that make a stay effortless. Markdown is welcome.")}
                              onChange={(e) =>
                                updateSection({ body: e.target.value })
                              }
                            />
                          </label>
                          <small>
                            {tr("Use **bold**, bullet lists, and links. Drag sections to reorder, or use the arrow buttons.")}
                          </small>
                          <div className="row">
                            {[-1, 1].map((direction) => (
                              <button
                                key={direction}
                                aria-label={
                                  direction === -1
                                    ? tr("Move section up")
                                    : tr("Move section down")
                                }
                                className="icon-button"
                                onClick={() => {
                                  const items = [...property.sections],
                                    index = items.findIndex(
                                      (s) => s.id === currentSection.id,
                                    ),
                                    target = index + direction;
                                  if (target >= 0 && target < items.length) {
                                    [items[index], items[target]] = [
                                      items[target],
                                      items[index],
                                    ];
                                    saveProperty({
                                      ...property,
                                      sections: items,
                                    });
                                  }
                                }}
                              >
                                {direction === -1 ? (
                                  <ArrowUp size={16} />
                                ) : (
                                  <ArrowDown size={16} />
                                )}
                              </button>
                            ))}
                            <button
                              className="button secondary small"
                              onClick={() =>
                                notify(
                                  live
                                    ? tr("All changes are saved automatically.")
                                    : tr("All changes are saved automatically on this device."),
                                )
                              }
                            >
                              <Check size={13} />
                              {tr("Save changes")}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              {!live && (
                <div className="notice" style={{ marginTop: 20 }}>
                  {tr("Demo editor · Changes are stored in this browser. Sign in to save guides online and share them with real guests.")}
                </div>
              )}
            </>
          )}
          {view === "inbox" && live && <LiveInbox notify={notify} />}
          {view === "inbox" && !live && (
            <>
              <PageHeading
                title={tr("A little human touch")}
                description={tr("Your concierge takes care of the everyday. You take care of the rest.")}
              />
              <div className="card inbox-grid">
                <div className="thread-list">
                  {threads.map((t) => (
                    <button
                      className={`thread-item ${thread.id === t.id ? "active" : ""}`}
                      key={t.id}
                      onClick={() => setThread(t)}
                    >
                      <div className="row">
                        <span className="avatar">{t.initials}</span>
                        <strong>{t.name}</strong>
                      </div>
                      <span>{t.property}</span>
                      <span>{t.message}</span>
                      <span
                        className="pill amber"
                        style={{ width: "fit-content" }}
                      >
                        {tr("Needs your help")}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="chat-panel">
                  <div className="row">
                    <span className="avatar">{thread.initials}</span>
                    <div>
                      <h3>{thread.name}</h3>
                      <small>{thread.property} · {tr("Sample conversation")}</small>
                    </div>
                  </div>
                  <div className="chat-messages">
                    <div className="notice">
                      {tr("The concierge couldn’t find this answer in the guide and passed it to you.")}
                    </div>
                    <div className="bubble">{thread.message}</div>
                    {state.replies[thread.id]?.map((r, i) => (
                      <div className="bubble host" key={i}>
                        {r}
                      </div>
                    ))}
                  </div>
                  <form
                    className="chat-compose"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (reply.trim()) {
                        updateDemo({
                          replies: {
                            ...state.replies,
                            [thread.id]: [
                              ...(state.replies[thread.id] || []),
                              reply.trim(),
                            ],
                          },
                        });
                        setReply("");
                        notify(tr("Reply saved in the demo. No guest message was sent."));
                      }
                    }}
                  >
                    <input
                      aria-label={tr("Reply to guest")}
                      placeholder={tr("A thoughtful reply…")}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <button className="button" aria-label={tr("Send demo reply")}>
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
          {view === "extras" && (
            <>
              <PageHeading
                title={tr("The little extras")}
                description={tr("Thoughtful touches for guests. A little more income for you.")}
              >
                <button className="button" onClick={() => setModal("extra")}>
                  <Plus size={16} />
                  {tr("Create extra")}
                </button>
              </PageHeading>
              {live ? (
                <LiveExtraRequests notify={notify} />
              ) : (
                <div className="notice" style={{ marginBottom: 22 }}>
                  {tr("Demo catalog · Sign in to receive real guest requests for your extras.")}
                </div>
              )}
              <div className="extras-grid">
                {state.properties.flatMap((p) =>
                  p.extras.map((extra) => (
                    <div className="card extra-card" key={p.id + extra.id}>
                      <div className="stat-icon">
                        <GuideIcon name={extra.icon} />
                      </div>
                      <small>{p.name}</small>
                      <h3 style={{ marginTop: 8 }}>{extra.name}</h3>
                      <p>{extra.description}</p>
                      <div className="price">
                        {money(extra.price)}{" "}
                        <small style={{ fontSize: 12 }}>
                          {tr("per stay")}
                        </small>
                      </div>
                      <span className={`pill ${extra.approval ? "amber" : ""}`}>
                        {extra.approval
                          ? tr("Host approval required")
                          : tr("Instant purchase")}
                      </span>
                      <div style={{ marginTop: 20 }}>
                        <Link
                          className="text-link"
                          href={`/g/${p.slug}?tab=extras`}
                        >
                          {tr("See guest experience")}
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  )),
                )}
              </div>
            </>
          )}
          {view === "analytics" && live && <LiveAnalytics />}
          {view === "analytics" && !live && (
            <>
              <PageHeading
                title={tr("Good stays, by the numbers")}
                description={tr("A little insight into what makes your guests feel at home.")}
              />
              <div className="notice">
                {tr("Sample analytics for demonstration. Sign in to see your real numbers.")}
              </div>
              <div className="stats-grid">
                {stats.map(({ label, value, icon: Icon }) => (
                  <div className="card stat-card" key={label}>
                    <div className="stat-top">
                      {label}
                      <Icon size={17} />
                    </div>
                    <div className="stat-value">{value}</div>
                  </div>
                ))}
              </div>
              <div className="split" style={{ marginTop: 25 }}>
                <div className="card panel" style={{ paddingBottom: 50 }}>
                  <h3>{tr("Guide views this week")}</h3>
                  <div
                    className="chart"
                    aria-label={tr("Sample guide views for the week")}
                  >
                    {[45, 65, 52, 78, 98, 81, 55].map((h, i) => (
                      <div key={i} className="chart-col">
                        <div style={{ height: h + "%" }} />
                        <span>
                          {tr(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card panel">
                  <h3>{tr("The things guests ask")}</h3>
                  {[
                    ["Wi-Fi & getting connected", "38%"],
                    ["Check-in & arrival", "27%"],
                    ["Local recommendations", "21%"],
                    ["Check-out details", "14%"],
                  ].map(([label, percent]) => (
                    <div className="activity-item" key={label}>
                      <span style={{ flex: 1, fontSize: 12 }}>{tr(label)}</span>
                      <strong>{percent}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {view === "share" && property && (
            <>
              <PageHeading
                title={tr("A warm welcome, shared")}
                description={tr("One little link. Everything your guests need.")}
              />
              <div className="split">
                <div className="stack no-print">
                  <label>
                    {tr("Your property")}
                    <select
                      value={property.id}
                      onChange={(e) => {
                        setSelected(e.target.value);
                        setQr("");
                      }}
                    >
                      {state.properties.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="card panel">
                    <h3>{tr("Send a little hello")}</h3>
                    <p
                      className="muted"
                      style={{ fontSize: 12, margin: "12px 0" }}
                    >
                      {tr("Add your guest guide to a welcome message or booking confirmation.")}
                    </p>
                    <div className="row">
                      <input
                        aria-label={tr("Guest guide link")}
                        readOnly
                        value={
                          typeof window === "undefined"
                            ? `/g/${property.slug}`
                            : `${window.location.origin}/g/${property.slug}`
                        }
                      />
                      <button
                        className="icon-button"
                        aria-label={tr("Copy guest link")}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${window.location.origin}/g/${property.slug}`,
                            );
                            notify(tr("Guest link copied."));
                          } catch {
                            notify(tr("Select the link and copy it manually."));
                          }
                        }}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <button
                      className="button secondary small"
                      style={{ marginTop: 15 }}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            tr("We’re looking forward to welcoming you to {name}! Here’s your personal guide with everything you need for a lovely stay: {link}\nSafe travels — see you soon!", {
                              name: property.name,
                              link: `${window.location.origin}/g/${property.slug}`,
                            }),
                          );
                          notify(tr("Welcome message copied."));
                        } catch {
                          notify(tr("Clipboard unavailable in this browser."));
                        }
                      }}
                    >
                      <Copy size={13} />
                      {tr("Copy welcome message")}
                    </button>
                  </div>
                  {!live && (
                    <div className="notice">
                      {tr("Local demo changes are visible on this device only. A QR code for a sample property works on any device.")}
                    </div>
                  )}
                </div>
                <div className="qr-card">
                  <Logo />
                  <h2>{tr("Make yourself at home.")}</h2>
                  <p>
                    {tr("Your guide to a lovely stay at {name}.", { name: property.name })}
                    <br />
                    {tr("Scan for all the little details.")}
                  </p>
                  {qr ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qr}
                      alt={tr("QR code for {name}", { name: property.name })}
                    />
                  ) : (
                    <button
                      className="button secondary no-print"
                      style={{ margin: "25px auto" }}
                      onClick={async () =>
                        setQr(
                          await QRCode.toDataURL(
                            `${window.location.origin}/g/${property.slug}`,
                            {
                              width: 512,
                              margin: 2,
                              color: { dark: "#10534c", light: "#ffffff" },
                            },
                          ),
                        )
                      }
                    >
                      <QrCode size={16} />
                      {tr("Generate QR card")}
                    </button>
                  )}
                  <p>{property.location}</p>
                  {qr && (
                    <button
                      onClick={() => window.print()}
                      className="button small no-print"
                      style={{ marginTop: 20 }}
                    >
                      <Download size={14} />
                      {tr("Print / save PDF")}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          {view === "billing" && live && <LiveBilling notify={notify} />}
          {view === "billing" && !live && (
            <>
              <PageHeading
                title={tr("A plan for every kind of host")}
                description={tr("Simple, per-property pricing. More time for what you love.")}
              />
              <div className="filter-bar">
                <label style={{ maxWidth: 220 }}>
                  {tr("Properties: {n}", { n: quantity })}
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </label>
                <div className="tabs">
                  <button
                    className={!yearly ? "active" : ""}
                    onClick={() => setYearly(false)}
                  >
                    {tr("Monthly")}
                  </button>
                  <button
                    className={yearly ? "active" : ""}
                    onClick={() => setYearly(true)}
                  >
                    {tr("Yearly · 2 months free")}
                  </button>
                </div>
              </div>
              <div className="pricing-grid">
                {selfServePlans.map((plan) => (
                  <div
                    className={`card pricing-card ${plan === "pro" ? "featured" : ""}`}
                    key={plan}
                  >
                    <div className="eyebrow">{plan === "free" ? tr("Free") : plans[plan].name}</div>
                    <h3>
                      {plan === "free"
                        ? tr("A thoughtful beginning")
                        : plan === "starter"
                          ? tr("For the independent host")
                          : tr("Your hospitality, elevated")}
                    </h3>
                    <div className="price">
                      {CURRENCY_SYMBOL}{priceFor(plan, plan === "free" ? 1 : quantity, yearly)}
                    </div>
                    <small>
                      {yearly ? tr("per year") : tr("per month")} ·{" "}
                      {plan === "free"
                        ? tr("1 property")
                        : quantity === 1
                          ? tr("1 property")
                          : tr("{n} properties", { n: quantity })}
                    </small>
                    <ul>
                      <li>
                        <Check size={14} />
                        {tr("{n} AI messages / property / month", { n: plans[plan].messages.toLocaleString() })}
                      </li>
                      <li>
                        <Check size={14} />
                        {tr("Beautiful offline guest guides")}
                      </li>
                      <li>
                        <Check size={14} />
                        {tr("Extras store · 5% platform fee")}
                      </li>
                      {plan === "pro" && (
                        <li>
                          <Check size={14} />
                          {tr("Priority support")}
                        </li>
                      )}
                    </ul>
                    <button
                      className="button secondary"
                      onClick={() =>
                        notify(tr("This is a demo workspace. Sign in with Google to choose a plan."))
                      }
                    >
                      {plan === "free"
                        ? tr("Try the demo")
                        : tr("Choose {plan}", { plan: plans[plan].name })}
                    </button>
                  </div>
                ))}
                <HotelPlanCard text={siteText(locale).hotel} />
              </div>
              <div className="notice" style={{ marginTop: 20 }}>
                {tr("Demo workspace · Sign in with Google to choose a plan. Prices in {code} ({symbol}), billed securely by Stripe.", {
                  code: CURRENCY.toUpperCase(),
                  symbol: CURRENCY_SYMBOL,
                })}
              </div>
            </>
          )}
          {view === "settings" && (
            <>
              <PageHeading
                title={tr("Make yourself at home.")}
                description={tr("Your workspace, your way.")}
              />
              <div className="split">
                <form
                  className="card panel form-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    updateDemo({
                      hostName: String(form.get("name")),
                      organization: String(form.get("organization")),
                    });
                    notify(tr("Workspace preferences saved on this device."));
                  }}
                >
                  <h3>{tr("Your workspace")}</h3>
                  <label>
                    {tr("Your first name")}
                    <input
                      name="name"
                      defaultValue={state.hostName}
                      required
                      maxLength={50}
                    />
                  </label>
                  <label>
                    {tr("Organization name")}
                    <input
                      name="organization"
                      defaultValue={state.organization}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    {tr("Dashboard language")}
                    <AppLanguageMenu />
                  </label>
                  <button className="button">{tr("Save preferences")}</button>
                </form>
                <div className="card panel stack">
                  <h3>{tr("The people behind the welcome")}</h3>
                  <div className="row">
                    <span className="avatar">
                      {live && liveState.user
                        ? (liveState.user.name || liveState.user.email).slice(0, 2).toUpperCase()
                        : "AM"}
                    </span>
                    <div>
                      <strong>{live && liveState.user ? liveState.user.name || liveState.user.email : `${state.hostName} Morgan`}</strong>
                      <br />
                      <small>{live && liveState.user ? tr("Workspace owner · {email}", { email: liveState.user.email }) : tr("Workspace owner · Demo")}</small>
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {live
                      ? tr("Team access for co-hosts and staff is coming soon.")
                      : tr("This is a demo workspace saved in your browser. Sign in with Google to create your real account.")}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => updateDemo({ dark: !state.dark })}
                  >
                    {state.dark ? <Sun size={15} /> : <Moon size={15} />}
                    {state.dark ? tr("Switch to light mode") : tr("Switch to dark mode")}
                  </button>
                  {!live && (
                    <Link href="/login" className="text-link">
                      {tr("Connect your account")}
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
          <footer className="dashboard-footer">
            <span>{tr("Made for thoughtful hosts. Built for memorable stays.")}</span>
            <span>
              {live ? tr("Saved securely online") : tr("Demo data · Saved on this device")}{" "}
              <Leaf size={11} style={{ display: "inline", marginInlineStart: 6 }} />
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal === "property" && (
        <Modal title={tr("A new place. A new welcome.")} close={close} closeLabel={tr("Close dialog")}>
          <p>{tr("Add the basics and bring your guest guide to life.")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProperty(new FormData(e.currentTarget));
            }}
            className="form-grid"
          >
            <label>
              {tr("Property name")}
              <input
                name="name"
                placeholder={tr("e.g. The Little Olive House")}
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label>
              {tr("City, country")}
              <input
                name="location"
                placeholder={tr("e.g. Gatlinburg, Tennessee")}
                required
                minLength={2}
              />
            </label>
            <label>
              {tr("Street address")} <small>{tr("Optional · used for “Open in Maps”")}</small>
              <input
                name="address"
                placeholder="e.g. 123 Ridge Road, Gatlinburg, TN 37738"
                maxLength={300}
                autoComplete="street-address"
              />
            </label>
            <label>
              {tr("Your house manual")} <small>{tr("Optional · Only content you own")}</small>
              <textarea
                name="description"
                maxLength={12000}
                placeholder={tr("Paste your arrival details, house rules, and favorite local tips…")}
              />
            </label>
            <div className="notice">
              {live && liveState.services.ai
                ? tr("Our AI will organize your text into guide sections using only what you wrote.")
                : tr("We’ll split your text into sections like Arrival, Wi-Fi and Checkout. Use labels such as “WI-FI:” for best results.")}
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="button" disabled={creating}>
              <Sparkles size={16} />
              {creating ? tr("Building your guide…") : tr("Create my guide")}
            </button>
          </form>
        </Modal>
      )}
      {modal === "extra" && (
        <Modal title={tr("A thoughtful little extra")} close={close} closeLabel={tr("Close dialog")}>
          <p>{tr("Give your guests one more reason to love their stay.")}</p>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const p = state.properties.find(
                (x) => x.id === form.get("property"),
              );
              if (!p) return;
              saveProperty({
                ...p,
                extras: [
                  ...p.extras,
                  {
                    id: crypto.randomUUID(),
                    name: String(form.get("name")),
                    description: String(form.get("description")),
                    price: Math.round(Number(form.get("price")) * 100),
                    icon: "gift",
                    approval: form.get("approval") === "on",
                  },
                ],
              });
              close();
              notify(tr("Extra added to your demo guide."));
            }}
          >
            <label>
              {tr("Property")}
              <select name="property">
                {state.properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("Name")}
              <input
                required
                name="name"
                placeholder={tr("A basket of local favorites")}
                maxLength={100}
              />
            </label>
            <label>
              {tr("Description")}
              <textarea required name="description" maxLength={1000} />
            </label>
            <label>
              {tr("Price ({symbol})", { symbol: CURRENCY_SYMBOL })}
              <input
                required
                type="number"
                name="price"
                min="1"
                max="10000"
                step="0.01"
                placeholder="25"
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                style={{ width: "auto" }}
                type="checkbox"
                name="approval"
                defaultChecked
              />
              {tr("Require my approval before payment")}
            </label>
            <button className="button">
              <Plus size={15} />
              {tr("Create extra")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function HeartIcon({ size = 15 }: { size?: number }) {
  return <ShieldCheck size={size} />;
}
