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
  type Plan,
  CURRENCY,
  CURRENCY_SYMBOL,
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
  const [quantity, setQuantity] = useState(2);
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
    [...nav, ...secondNav].find((n) => n[0] === view)?.[1] || "Guide editor";
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
            ? "Property created. AI organized your guide — have a look."
            : "Property created. Your guide is ready to edit.",
        );
        router.push("/dashboard/editor");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create the property.");
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
            body: "Add your property’s " + s.type + " information here.",
          })),
      extras: [],
    };
    saveProperty(next);
    setSelected(id);
    close();
    notify("Property created. Your guide is ready to edit.");
    router.push("/dashboard/editor");
  }
  const stats = [
    {
      label: "Guide views",
      value: "1,284",
      foot: "+18.6%",
      detail: "vs. previous month",
      icon: Eye,
    },
    {
      label: "AI conversations",
      value: "342",
      foot: "94%",
      detail: "answered without you",
      icon: MessageCircle,
    },
    {
      label: "Extras revenue",
      value: `${CURRENCY_SYMBOL}486`,
      foot: "+24.2%",
      detail: "vs. previous month",
      icon: Gift,
    },
    {
      label: "Happy guests",
      value: "98%",
      foot: "4.9 / 5",
      detail: "average guest rating",
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
              alt={`${p.name}, a welcoming holiday home`}
              loading="lazy"
            />
            <span className={`pill ${p.status === "draft" ? "amber" : ""}`}>
              {p.status === "published" ? "Published" : "Draft"}
            </span>
            <button
              aria-label={`Edit ${p.name}`}
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
              <Link aria-label={`Preview ${p.name}`} href={`/g/${p.slug}`}>
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
                {p.sections.length} sections
              </span>
              <span>
                <Eye size={12} />
                {i < 2 ? [842, 442][i] : 0} demo views
              </span>
              <span>
                <MessageCircle size={12} />
                {i < 2 ? [218, 124][i] : 0} chats
              </span>
            </div>
            <div className="property-bottom">
              <small>Made with a little extra care</small>
              <div className="row">
                <button
                  className="icon-button"
                  aria-label={`Share ${p.name}`}
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
                  Edit guide
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
      className={state.dark ? "theme-dark" : ""}
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
              aria-label="Close navigation"
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
            <small>Host workspace</small>
          </div>
          <ChevronDown size={12} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <Link
              key={path}
              href={`/dashboard${path ? "/" + path : ""}`}
              onClick={() => setMobile(false)}
              className={`nav-item ${view === path ? "active" : ""}`}
            >
              <Icon size={17} strokeWidth={1.6} />
              {label}
              {path === "inbox" && <span className="badge">2</span>}
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
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <Sparkles size={18} color="#8a9b6c" />
            <h3>A little more possibility.</h3>
            <p>
              More properties. Your own brand.
              <br />
              Even better guest experiences.
            </p>
            <Link className="button cream" href="/dashboard/billing">
              Explore Pro
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <Link href="/dashboard/settings" className="sidebar-user">
            <span className="avatar">{state.hostName.slice(0, 1)}M</span>
            <div>
              <strong>{state.hostName} Morgan</strong>
              <br />
              <small>Demo host account</small>
            </div>
            <ChevronDown size={12} style={{ marginLeft: "auto" }} />
          </Link>
        </div>
      </aside>
      <div className="dashboard-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={17} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <span style={{ color: "var(--ink)" }}>{title}</span>
          </div>
          <div className="topbar-right">
            {live ? (
              <span className="demo-badge" role="status">
                {liveState.sync === "saving"
                  ? "SAVING…"
                  : liveState.sync === "error"
                    ? "NOT SAVED · RETRYING ON NEXT EDIT"
                    : "ALL CHANGES SAVED"}
              </span>
            ) : (
              <>
                <span className="demo-badge">DEMO WORKSPACE</span>
                {liveState.services.accounts && (
                  <Link href="/login">Sign in</Link>
                )}
              </>
            )}
            <Link href="/demo">
              View guest experience
              <ArrowUpRight
                size={12}
                style={{ display: "inline", marginLeft: 5 }}
              />
            </Link>
            <button
              aria-label="Toggle dark mode"
              onClick={() => updateDemo({ dark: !state.dark })}
            >
              {state.dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link aria-label="Guest notifications" href="/dashboard/inbox">
              <Bell size={17} />
            </Link>
            {live && liveState.user ? (
              <form action={signOutAction}>
                <button
                  className="avatar"
                  title={`Signed in as ${liveState.user.email}. Click to sign out.`}
                  aria-label={`Sign out ${liveState.user.email}`}
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
                    YOUR LITTLE HOSTING HEADQUARTERS
                  </div>
                  <h1 className="welcome-title">
                    Good things start with a <span>great stay.</span>
                  </h1>
                  <p>
                    Welcome back, {state.hostName}. Here’s how your properties
                    are doing.
                  </p>
                </div>
                <span className="button secondary date-button">
                  <CalendarDays size={13} />
                  Demo month
                  <ChevronDown size={12} />
                </span>
              </div>
              <section className="hero-banner">
                <div className="hero-banner-copy">
                  <div className="eyebrow">LESS MANAGING. MORE HOSTING.</div>
                  <h2>
                    A thoughtful stay,
                    <br />
                    without the extra work.
                  </h2>
                  <p>
                    Your guides handle the little questions.
                    <br />
                    You focus on making guests feel at home.
                  </p>
                  <button
                    className="button"
                    onClick={() => setModal("property")}
                  >
                    <Plus size={13} />
                    Create a guide
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
                      <small>YOUR HOME AWAY FROM HOME</small>
                      <br />
                      <strong>Olá, welcome home.</strong>
                      <div className="mini-grid">
                        <span>
                          <Wifi size={10} />
                          Wi-Fi
                        </span>
                        <span>
                          <MapPin size={10} />
                          Explore
                        </span>
                        <span>
                          <BookOpen size={10} />
                          Your stay
                        </span>
                        <span>
                          <Gift size={10} />
                          Little extras
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="floating-chip">
                    <CheckCheck size={20} />
                    <div>
                      <strong>Happy guests. Happy host.</strong>
                      <small>Thoughtful details, all in one place.</small>
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
                  Your properties{" "}
                  <small>
                    {state.properties.length} little places. Endless
                    possibilities.
                  </small>
                </h2>
                <Link className="text-link" href="/dashboard/properties">
                  View all properties
                  <ArrowRight size={13} />
                </Link>
              </div>
              {cards}
              <div className="bottom-grid">
                <section className="card panel">
                  <div className="panel-title">
                    <h2>Around your properties</h2>
                    <Link className="text-link" href="/dashboard/inbox">
                      View inbox
                      <ArrowUpRight size={12} />
                    </Link>
                  </div>
                  {[
                    {
                      icon: Gift,
                      title: "A slower goodbye, booked.",
                      detail: "Casa Serena · Late checkout · " + CURRENCY_SYMBOL + "35",
                      time: "12 min ago",
                    },
                    {
                      icon: MessageCircle,
                      title: "One less question on your plate.",
                      detail:
                        "The Olive Grove · Wi-Fi details shared by concierge",
                      time: "34 min ago",
                    },
                    {
                      icon: BookOpen,
                      title: "A warm welcome, delivered.",
                      detail: "Casa Serena · A guest opened their guide",
                      time: "1 hour ago",
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
                    <Lightbulb size={14} />A LITTLE HOSTING INSPIRATION
                  </div>
                  <h3>
                    Small extras.
                    <br />
                    Memorable experiences.
                  </h3>
                  <p>
                    A late checkout. A local breakfast.
                    <br />
                    Turn thoughtful touches into extra income, and give guests a
                    stay to remember.
                  </p>
                  <Link href="/dashboard/extras" className="text-link">
                    Explore your extras
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
                title="Your properties"
                description="Beautiful places deserve a thoughtful welcome."
              >
                <button className="button" onClick={() => setModal("property")}>
                  <Plus size={16} />
                  Add property
                </button>
              </PageHeading>
              <div className="filter-bar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search properties"
                    placeholder="Find a little place…"
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
                      {f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {propertyCards.length ? (
                cards
              ) : (
                <Empty
                  title="No properties here yet"
                  description="Create a property or try another search."
                >
                  <button
                    className="button"
                    onClick={() => setModal("property")}
                  >
                    Add a property
                  </button>
                </Empty>
              )}
            </>
          )}
          {view === "editor" && property && (
            <>
              <PageHeading
                title={property.name}
                description="A little local knowledge goes a long way."
              >
                <Link className="button secondary" href={`/g/${property.slug}`}>
                  <Eye size={15} />
                  Guest preview
                </Link>
                {live && (
                  <button
                    className="button secondary"
                    onClick={async () => {
                      if (!confirm(`Delete ${property.name} and its guide? This cannot be undone.`)) return;
                      try {
                        await deleteLiveProperty(property.id);
                        notify("Property deleted.");
                        router.push("/dashboard/properties");
                      } catch {
                        notify("Couldn’t delete the property. Please try again.");
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
              </PageHeading>
              <div className="filter-bar">
                <select
                  aria-label="Select property to edit"
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
                  <span className="muted" style={{ fontSize: 11 }}>
                    Saved on this device
                  </span>
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
                          ? "Guide moved to draft."
                          : "Demo guide published on this device.",
                      );
                    }}
                  >
                    {property.status === "published"
                      ? "Unpublish"
                      : "Publish guide"}
                  </button>
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
                            title: "A new little detail",
                            body: "",
                            icon: "book",
                          },
                        ],
                      });
                      setSectionId(id);
                    }}
                  >
                    <Plus size={15} />
                    Add section
                  </button>
                </div>
                <div className="card section-editor">
                  {currentSection && (
                    <>
                      <div className="filter-bar">
                        <h3>Make it feel like you.</h3>
                        <div className="tabs">
                          <button
                            className={!editPreview ? "active" : ""}
                            onClick={() => setEditPreview(false)}
                          >
                            Write
                          </button>
                          <button
                            className={editPreview ? "active" : ""}
                            onClick={() => setEditPreview(true)}
                          >
                            Preview
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
                            Section title
                            <input
                              value={currentSection.title}
                              onChange={(e) =>
                                updateSection({ title: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Icon
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
                            Your local knowledge
                            <textarea
                              rows={12}
                              value={currentSection.body}
                              placeholder="All the details that make a stay effortless. Markdown is welcome."
                              onChange={(e) =>
                                updateSection({ body: e.target.value })
                              }
                            />
                          </label>
                          <small>
                            Use **bold**, bullet lists, and links. Drag sections
                            to reorder, or use the arrow buttons.
                          </small>
                          <div className="row">
                            {[-1, 1].map((direction) => (
                              <button
                                key={direction}
                                aria-label={
                                  direction === -1
                                    ? "Move section up"
                                    : "Move section down"
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
                                  "All changes are saved automatically on this device.",
                                )
                              }
                            >
                              <Check size={13} />
                              Save changes
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
                  Demo editor · Changes are stored in this browser. Sign in to
                  save guides online and share them with real guests.
                </div>
              )}
            </>
          )}
          {view === "inbox" && live && <LiveInbox notify={notify} />}
          {view === "inbox" && !live && (
            <>
              <PageHeading
                title="A little human touch"
                description="Your concierge takes care of the everyday. You take care of the rest."
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
                        Needs your help
                      </span>
                    </button>
                  ))}
                </div>
                <div className="chat-panel">
                  <div className="row">
                    <span className="avatar">{thread.initials}</span>
                    <div>
                      <h3>{thread.name}</h3>
                      <small>{thread.property} · Sample conversation</small>
                    </div>
                  </div>
                  <div className="chat-messages">
                    <div className="notice">
                      The concierge couldn’t find this answer in the guide and
                      passed it to you.
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
                        notify(
                          "Reply saved in the demo. No guest message was sent.",
                        );
                      }
                    }}
                  >
                    <input
                      aria-label="Reply to guest"
                      placeholder="A thoughtful reply…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <button className="button" aria-label="Send demo reply">
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
                title="The little extras"
                description="Thoughtful touches for guests. A little more income for you."
              >
                <button className="button" onClick={() => setModal("extra")}>
                  <Plus size={16} />
                  Create extra
                </button>
              </PageHeading>
              {live ? (
                <LiveExtraRequests notify={notify} />
              ) : (
                <div className="notice" style={{ marginBottom: 22 }}>
                  Demo catalog · Sign in to receive real guest requests for your
                  extras.
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
                          per stay
                        </small>
                      </div>
                      <span className={`pill ${extra.approval ? "amber" : ""}`}>
                        {extra.approval
                          ? "Host approval required"
                          : "Instant purchase"}
                      </span>
                      <div style={{ marginTop: 20 }}>
                        <Link
                          className="text-link"
                          href={`/g/${p.slug}?tab=extras`}
                        >
                          See guest experience
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
                title="Good stays, by the numbers"
                description="A little insight into what makes your guests feel at home."
              />
              <div className="notice">
                Sample analytics for demonstration. Live metrics will appear
                after your Supabase project is connected.
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
                  <h3>Guide views this week</h3>
                  <div
                    className="chart"
                    aria-label="Sample guide views: Monday 120, Tuesday 180, Wednesday 145, Thursday 210, Friday 265, Saturday 220, Sunday 144"
                  >
                    {[45, 65, 52, 78, 98, 81, 55].map((h, i) => (
                      <div key={i} className="chart-col">
                        <div style={{ height: h + "%" }} />
                        <span>
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card panel">
                  <h3>The things guests ask</h3>
                  {[
                    ["Wi-Fi & getting connected", "38%"],
                    ["Check-in & arrival", "27%"],
                    ["Local recommendations", "21%"],
                    ["Check-out details", "14%"],
                  ].map(([label, percent]) => (
                    <div className="activity-item" key={label}>
                      <span style={{ flex: 1, fontSize: 12 }}>{label}</span>
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
                title="A warm welcome, shared"
                description="One little link. Everything your guests need."
              />
              <div className="split">
                <div className="stack no-print">
                  <label>
                    Your property
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
                    <h3>Send a little hello</h3>
                    <p
                      className="muted"
                      style={{ fontSize: 12, margin: "12px 0" }}
                    >
                      Add your guest guide to a welcome message or booking
                      confirmation.
                    </p>
                    <div className="row">
                      <input
                        aria-label="Guest guide link"
                        readOnly
                        value={
                          typeof window === "undefined"
                            ? `/g/${property.slug}`
                            : `${window.location.origin}/g/${property.slug}`
                        }
                      />
                      <button
                        className="icon-button"
                        aria-label="Copy guest link"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${window.location.origin}/g/${property.slug}`,
                            );
                            notify("Guest link copied.");
                          } catch {
                            notify("Select the link and copy it manually.");
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
                            `We’re looking forward to welcoming you to ${property.name}! Here’s your personal guide with everything you need for a lovely stay: ${window.location.origin}/g/${property.slug}\nSafe travels — see you soon!`,
                          );
                          notify("Welcome message copied.");
                        } catch {
                          notify("Clipboard unavailable in this browser.");
                        }
                      }}
                    >
                      <Copy size={13} />
                      Copy welcome message
                    </button>
                  </div>
                  <div className="notice">
                    Local demo changes are visible on this device only. A QR
                    code for a sample property works on any device.
                  </div>
                </div>
                <div className="qr-card">
                  <Logo />
                  <h2>Make yourself at home.</h2>
                  <p>
                    Your guide to a lovely stay at {property.name}.<br />
                    Scan for all the little details.
                  </p>
                  {qr ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qr}
                      alt={`QR code for ${property.name}`}
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
                      Generate QR card
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
                      Print / save PDF
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
                title="A plan for every kind of host"
                description="Simple, per-property pricing. More time for what you love."
              />
              <div className="filter-bar">
                <label style={{ maxWidth: 220 }}>
                  Properties: {quantity}
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
                    Monthly
                  </button>
                  <button
                    className={yearly ? "active" : ""}
                    onClick={() => setYearly(true)}
                  >
                    Yearly · 2 months free
                  </button>
                </div>
              </div>
              <div className="pricing-grid">
                {(Object.keys(plans) as Plan[]).map((plan) => (
                  <div
                    className={`card pricing-card ${plan === "pro" ? "featured" : ""}`}
                    key={plan}
                  >
                    <div className="eyebrow">{plans[plan].name}</div>
                    <h3>
                      {plan === "free"
                        ? "A thoughtful beginning"
                        : plan === "starter"
                          ? "For the independent host"
                          : "Your hospitality, elevated"}
                    </h3>
                    <div className="price">
                      {CURRENCY_SYMBOL}{priceFor(plan, plan === "free" ? 1 : quantity, yearly)}
                    </div>
                    <small>
                      {yearly ? "per year" : "per month"} ·{" "}
                      {plan === "free"
                        ? "1 property"
                        : `${quantity} properties`}
                    </small>
                    <ul>
                      <li>
                        <Check size={14} />
                        {plans[plan].messages} AI messages / property / month
                      </li>
                      <li>
                        <Check size={14} />
                        Beautiful offline guest guides
                      </li>
                      <li>
                        <Check size={14} />
                        Extras store · 5% platform fee
                      </li>
                      {plan === "pro" && (
                        <li>
                          <Check size={14} />
                          Custom branding & domain
                        </li>
                      )}
                    </ul>
                    <button
                      className="button secondary"
                      onClick={() =>
                        notify(
                          "Billing is not connected yet. No subscription was created.",
                        )
                      }
                    >
                      {plan === "free"
                        ? "Try the demo"
                        : `Choose ${plans[plan].name}`}
                    </button>
                  </div>
                ))}
              </div>
              <div className="notice" style={{ marginTop: 20 }}>
                Billing preview · Stripe account and product prices are required
                before subscriptions can be purchased. All prices in {CURRENCY.toUpperCase()} ({CURRENCY_SYMBOL}).
              </div>
            </>
          )}
          {view === "settings" && (
            <>
              <PageHeading
                title="Make yourself at home"
                description="Your workspace, your way."
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
                    notify("Workspace preferences saved on this device.");
                  }}
                >
                  <h3>Your workspace</h3>
                  <label>
                    Your first name
                    <input
                      name="name"
                      defaultValue={state.hostName}
                      required
                      maxLength={50}
                    />
                  </label>
                  <label>
                    Organization name
                    <input
                      name="organization"
                      defaultValue={state.organization}
                      required
                      maxLength={100}
                    />
                  </label>
                  <button className="button">Save preferences</button>
                </form>
                <div className="card panel stack">
                  <h3>The people behind the welcome</h3>
                  <div className="row">
                    <span className="avatar">AM</span>
                    <div>
                      <strong>{state.hostName} Morgan</strong>
                      <br />
                      <small>Workspace owner · Demo</small>
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>
                    Team invitations, custom domains, and account management
                    become available when authentication is connected.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => updateDemo({ dark: !state.dark })}
                  >
                    {state.dark ? <Sun size={15} /> : <Moon size={15} />}Switch
                    to {state.dark ? "light" : "dark"} mode
                  </button>
                  <Link href="/login" className="text-link">
                    Connect your account
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </>
          )}
          <footer className="dashboard-footer">
            <span>Made for thoughtful hosts. Built for memorable stays.</span>
            <span>
              Demo data · Saved on this device{" "}
              <Leaf size={11} style={{ display: "inline", marginLeft: 6 }} />
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
        <Modal title="A new place. A new welcome." close={close}>
          <p>Add the basics and bring your guest guide to life.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProperty(new FormData(e.currentTarget));
            }}
            className="form-grid"
          >
            <label>
              Property name
              <input
                name="name"
                placeholder="e.g. The Little Olive House"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label>
              City, country
              <input
                name="location"
                placeholder="e.g. Lisbon, Portugal"
                required
                minLength={2}
              />
            </label>
            <label>
              Your house manual <small>Optional · Only content you own</small>
              <textarea
                name="description"
                maxLength={12000}
                placeholder="Paste your arrival details, house rules, and favorite local tips…"
              />
            </label>
            <div className="notice">
              {live && liveState.services.ai
                ? "Our AI will organize your text into guide sections using only what you wrote."
                : "We’ll split your text into sections like Arrival, Wi-Fi and Checkout. Use labels such as “WI-FI:” for best results."}
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="button" disabled={creating}>
              <Sparkles size={16} />
              {creating ? "Building your guide…" : "Create my guide"}
            </button>
          </form>
        </Modal>
      )}
      {modal === "extra" && (
        <Modal title="A thoughtful little extra" close={close}>
          <p>Give your guests one more reason to love their stay.</p>
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
              notify("Extra added to your demo guide.");
            }}
          >
            <label>
              Property
              <select name="property">
                {state.properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Name
              <input
                required
                name="name"
                placeholder="A basket of local favorites"
                maxLength={100}
              />
            </label>
            <label>
              Description
              <textarea required name="description" maxLength={1000} />
            </label>
            <label>
              Price ({CURRENCY_SYMBOL})
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
              Require my approval before payment
            </label>
            <button className="button">
              <Plus size={15} />
              Create extra
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
