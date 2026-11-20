"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, ArrowRight, BedDouble, Check, Clipboard, Clock3, Download,
  ExternalLink, House, MapPin, MessageCircle, Mountain, Building2,
  QrCode, ShieldCheck, Sparkles, Wifi,
} from "lucide-react";
import type { SalesPreviewProperty } from "@/lib/sales-preview-data";
import styles from "@/app/demo/preview/[slug]/page.module.css";

export function SalesPreviewGuide({ property }: { property: SalesPreviewProperty }) {
  const [pageUrl, setPageUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const Symbol = property.icon === "mountain" ? Mountain : property.icon === "city" ? Building2 : House;
  const theme = { "--accent": property.accent, "--tint": property.tint } as CSSProperties;

  useEffect(() => {
    let active = true;
    const canonical = new URL(window.location.pathname, window.location.origin).toString();
    queueMicrotask(() => { if (active) setPageUrl(canonical); });
    void QRCode.toDataURL(canonical, {
      width: 320, margin: 2, errorCorrectionLevel: "M",
      color: { dark: "#193b36", light: "#ffffff" },
    }).then((image) => { if (active) setQrUrl(image); })
      .catch(() => { if (active) setError("The QR code could not be generated. You can still copy the link."); });
    return () => { active = false; };
  }, []);

  const message = "Independent GetStayGuide demonstration for " + property.name +
    " (not an official property guide). Preview its mobile guest information here: " +
    pageUrl + " — no booking details or access codes are included.";
  const whatsappUrl = pageUrl ? "https://wa.me/?text=" + encodeURIComponent(message) : "";
  const enquiry = "mailto:abdelhaktirha@gmail.com?subject=" +
    encodeURIComponent("£99 guest guide enquiry — " + property.name);

  async function copyLink() {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied("Preview link copied");
    } catch {
      setCopied("Select the link below to copy it manually.");
    }
  }
  function downloadQr() {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = property.slug + "-concept-preview-qr.png";
    link.click();
  }

  return (
    <main className={styles.root} style={theme}>
      <nav className={styles.nav} aria-label="Sales demonstration navigation">
        <Link href="/demo/previews" className={styles.back}><ArrowLeft size={17} aria-hidden="true" /> Three concept previews</Link>
        <Link href="/" className={styles.brand}>GetStayGuide<span>.</span></Link>
        <a href="#offer" className={styles.navCta}>£99 offer <ArrowRight size={14} aria-hidden="true" /></a>
      </nav>
      <div className={styles.notice} role="note">
        <ShieldCheck size={16} aria-hidden="true" />
        Independent concept using public information — not an official guide or endorsed by {property.operator}. No guests or operators are contacted by this page.
      </div>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>PERSONALISED GUEST-GUIDE CONCEPT</span>
          <p className={styles.operator}>A sample concept for {property.operator}</p>
          <h1>{property.name}</h1>
          <p className={styles.location}><MapPin size={16} aria-hidden="true" /> {property.shortLocation} · {property.region}</p>
          <p className={styles.intro}>{property.intro}</p>
          <div className={styles.heroActions}>
            <a href="#guest-guide" className={styles.primary}>Explore guide sections <ArrowRight size={17} aria-hidden="true" /></a>
            <a href="#share" className={styles.secondary}><MessageCircle size={17} aria-hidden="true" /> Try WhatsApp share</a>
          </div>
          <div className={styles.highlightRow}>
            {property.highlights.map((label) => <span key={label}><Check size={13} aria-hidden="true" />{label}</span>)}
          </div>
        </div>
        <div className={styles.art}>
          <div className={styles.orb}><Symbol size={105} strokeWidth={1} aria-hidden="true" /></div>
          <div className={styles.artCopy}>
            <span>YOUR STAY, MADE SIMPLE</span>
            <h2>{property.heroTitle}</h2>
            <p>Arrival · Essentials · Local discoveries</p>
          </div>
          <div className={styles.miniCard}><Sparkles size={17} aria-hidden="true" /><span>Designed to open beautifully on any phone</span></div>
        </div>
      </section>

      <section id="guest-guide" className={styles.section}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>A PREVIEW OF THE GUEST EXPERIENCE</span>
          <h2>Useful answers, all in one place</h2>
          <p>These sections use the operator's public listing as a starting point. In a purchased guide, the operator reviews and approves every instruction before guests receive it.</p>
        </div>
        <div className={styles.contentGrid}>
          <div className={styles.sections}>
            {property.sections.map((section, index) => (
              <details key={section.title} className={styles.detail} open={index === 0 ? true : undefined}>
                <summary><span className={styles.summaryNumber}>{String(index + 1).padStart(2,"0")}</span>{section.title}<span className={styles.plus}>+</span></summary>
                <div className={styles.markdown}><ReactMarkdown>{section.content}</ReactMarkdown></div>
              </details>
            ))}
          </div>
          <aside className={styles.stayCard}>
            <div className={styles.stayCardIcon}><BedDouble size={26} aria-hidden="true" /></div>
            <span className={styles.miniLabel}>AT A GLANCE</span>
            <strong>{property.capacity}</strong>
            <p>{property.shortLocation}</p>
            <div className={styles.stayRule}><Wifi size={17} aria-hidden="true" /><span>Verified Wi-Fi credentials provided only after host approval</span></div>
            <div className={styles.stayRule}><Clock3 size={17} aria-hidden="true" /><span>Real arrival and departure details confirmed by the operator</span></div>
            <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.official}>See the original property listing <ExternalLink size={14} aria-hidden="true" /></a>
          </aside>
        </div>
      </section>

      <section id="share" className={styles.shareSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>TRY IT YOURSELF</span>
          <h2>WhatsApp message + scannable QR</h2>
          <p>The sample link opens this concept page. The finished £99 guide would have a dedicated approved guest URL and QR code for the actual property.</p>
        </div>
        <div className={styles.shareGrid}>
          <article className={styles.messageCard}>
            <div className={styles.cardHeader}><MessageCircle size={20} aria-hidden="true" /><div><strong>Manual WhatsApp sharing</strong><span>Opens the guest's own WhatsApp composer</span></div></div>
            <div className={styles.chatPane}><div className={styles.bubble}>{message || "Preparing demo message…"}</div></div>
            <div className={styles.cardBottom}>
              {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.whatsappButton}><MessageCircle size={18} aria-hidden="true" /> Open WhatsApp composer</a> : <span className={styles.inactive}>Preparing link…</span>}
              <small>No messages are sent automatically, and no OpenWA gateway is used.</small>
            </div>
          </article>
          <article className={styles.qrCard}>
            <div className={styles.cardHeader}><QrCode size={20} aria-hidden="true" /><div><strong>QR and shareable link</strong><span>Scan with another phone to open the concept</span></div></div>
            <div className={styles.qrFrame}>
              <span>WELCOME TO</span>
              <strong>{property.name}</strong>
              {qrUrl ? <img src={qrUrl} alt={"QR code linking to the independent " + property.name + " concept preview"} width={194} height={194} /> : <div className={styles.qrPending}>Generating QR…</div>}
              <small>Independent sample · not official guest instructions</small>
            </div>
            <div className={styles.qrButtons}>
              <button onClick={copyLink} disabled={!pageUrl} type="button"><Clipboard size={16} aria-hidden="true" /> Copy link</button>
              <button onClick={downloadQr} disabled={!qrUrl} type="button"><Download size={16} aria-hidden="true" /> Save QR</button>
            </div>
            <input aria-label="Shareable concept preview URL" value={pageUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
            {copied && <p role="status" className={styles.status}>{copied}</p>}
            {error && <p role="status" className={styles.status}>{error}</p>}
          </article>
        </div>
      </section>

      <section id="offer" className={styles.offer}>
        <div>
          <span>FOR ONE FINISHED, OWNER-APPROVED PROPERTY GUIDE</span>
          <h2>One professional guide, ready for guests.</h2>
          <p>Branded mobile layout, approved arrival and house information, local tips, a shareable guest URL, QR code and manual WhatsApp sharing, with a handover walkthrough.</p>
          <small>One-time setup price. Hosting, future maintenance and any recurring fees must be agreed before purchase. No automated OpenWA sending is included.</small>
        </div>
        <div className={styles.offerCard}><span>ONE-TIME SETUP</span><strong>£99</strong><a href={enquiry} className={styles.primary}>Ask about this guide <ArrowRight size={16} aria-hidden="true" /></a></div>
      </section>
      <footer className={styles.footer}>
        <p>GetStayGuide independent demonstration · No endorsement or live guest support implied.</p>
        <Link href="/demo/whatsapp">View the Casa Serena WhatsApp walkthrough <ArrowRight size={14} aria-hidden="true" /></Link>
      </footer>
    </main>
  );
}
