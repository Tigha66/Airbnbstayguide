"use client";

/**
 * A safe, publicly viewable sales demonstration.
 * WhatsApp uses the guest's own composer: NO OpenWA API calls, webhooks,
 * guest telephone numbers, or server-side messages are involved.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import ReactMarkdown from "react-markdown";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { demoProperties } from "@stayguide/shared";
import styles from "./page.module.css";

const property = demoProperties.find((item) => item.slug === "casa-serena");
const importantSections = ["arrival", "wifi", "rules", "checkout", "local"];
const sampleMessage = (url: string) =>
  "Welcome to Casa Serena! Here is your digital guest guide with arrival information, house rules, check-out details and local tips: " +
  url +
  "\n\nThis is a demonstration, not a real reservation message.";

export default function WhatsAppSalesDemo() {
  const [guestUrl, setGuestUrl] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

  // Use the CURRENT origin so both Preview and Production QR codes
  // open a real guide on the same host instead of a hard-coded hostname.
  useEffect(() => {
    const url = new URL("/g/casa-serena", window.location.origin).toString();
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setGuestUrl(url); });
    void QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#174139", light: "#ffffff" },
    }).then((dataUrl) => {
      if (!cancelled) setQrImage(dataUrl);
    }).catch(() => {
      if (!cancelled) setQrImage("");
    });
    return () => { cancelled = true; };
  }, []);

  if (!property) return <main className={styles.wrapper}>Sample guide is unavailable.</main>;

  const whatsappUrl = guestUrl
    ? "https://wa.me/?text=" + encodeURIComponent(sampleMessage(guestUrl))
    : "";
  const guideSections = property.sections.filter((s) => importantSections.includes(s.id));

  async function copyGuestLink() {
    if (!guestUrl) return;
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopyNotice("Guest link copied");
    } catch {
      setCopyNotice("Could not copy automatically. Select the link below.");
    }
  }

  function saveQr() {
    if (!qrImage) return;
    const anchor = document.createElement("a");
    anchor.href = qrImage;
    anchor.download = "casa-serena-sample-guide-qr.png";
    anchor.click();
  }

  return (
    <main className={styles.wrapper}>
      <div className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="GetStayGuide home">
          <span className={styles.brandMark}>G</span>
          getstayguide<span className={styles.brandDot}>.</span>
        </Link>
        <div className={styles.topActions}>
          <span className={styles.sampleLabel}>SALES DEMONSTRATION</span>
          <Link href="/g/casa-serena" className={styles.topLink}>
            View guest guide <ExternalLink size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>ONE GUIDE. EASY SHARING.</span>
          <h1>A warmer welcome, delivered by WhatsApp.</h1>
          <p>
            Give every guest a beautiful mobile guide with the information they need.
            Send its link through WhatsApp, email or a printed QR code. No guest app or login required.
          </p>
          <div className={styles.heroActions}>
            <a href="#share" className={styles.primaryAction}>
              Try WhatsApp sharing <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link href="/g/casa-serena" className={styles.secondaryAction}>
              Open the guest guide
            </Link>
          </div>
          <div className={styles.heroTags}>
            <span><Check size={15} aria-hidden="true" /> Mobile-friendly</span>
            <span><Check size={15} aria-hidden="true" /> Guest link + QR</span>
            <span><Check size={15} aria-hidden="true" /> No guest login</span>
          </div>
        </div>

        <div className={styles.previewFrame}>
          <div className={styles.phone} aria-label="Casa Serena guest guide preview">
            <div className={styles.phoneTop}><span /> CASA SERENA <span /></div>
            <div
              className={styles.propertyImage}
              style={{ backgroundImage: "linear-gradient(180deg, transparent 45%, rgba(13,36,31,.78)), url(" + property.image + ")" }}
            >
              <div className={styles.propertyImageText}>
                <span><MapPin size={13} aria-hidden="true" /> {property.location}</span>
                <strong>{property.name}</strong>
              </div>
            </div>
            <div className={styles.phoneContent}>
              <p>Welcome to your stay</p>
              <h2>Your home away from home.</h2>
              <div className={styles.stayTimes}>
                <div><small>CHECK-IN</small><strong>{property.checkIn}</strong></div>
                <div><small>CHECK-OUT</small><strong>{property.checkOut}</strong></div>
              </div>
              <div className={styles.phoneFeatures}>
                <span><Wifi size={17} aria-hidden="true" /> Wi-Fi & house rules</span>
                <span><MapPin size={17} aria-hidden="true" /> Local recommendations</span>
              </div>
              <Link href="/g/casa-serena" className={styles.phoneLink}>
                Explore guest guide <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className={styles.floatingNote}>
            <MessageCircle size={19} aria-hidden="true" />
            <div><strong>One easy link</strong><small>Ready to share with guests</small></div>
          </div>
        </div>
      </section>

      <section className={styles.process} aria-labelledby="process-heading">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>HOW IT WORKS</span>
          <h2 id="process-heading">Three simple steps</h2>
          <p>Less time repeating instructions. A smoother experience for every arrival.</p>
        </div>
        <div className={styles.stepGrid}>
          <article><span className={styles.stepIcon}><Smartphone size={23} /></span><small>01</small><h3>Build one mobile guide</h3><p>Approved arrival details, Wi-Fi guidance, house rules, checkout and recommendations in one place.</p></article>
          <article><span className={styles.stepIcon}><MessageCircle size={23} /></span><small>02</small><h3>Share through WhatsApp</h3><p>Open a pre-written message in WhatsApp, choose the guest and press Send yourself.</p></article>
          <article><span className={styles.stepIcon}><QrCode size={23} /></span><small>03</small><h3>Guests open instantly</h3><p>The link or QR code opens the guest guide in their phone browser—no downloads or sign-up.</p></article>
        </div>
      </section>

      <section id="share" className={styles.shareSection} aria-labelledby="share-heading">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>INTERACTIVE TRY-IT-YOURSELF DEMO</span>
          <h2 id="share-heading">Try sharing Casa Serena</h2>
          <p>This is a fictional demonstration property. These buttons use a real public sample guide, without sending a WhatsApp message automatically.</p>
        </div>
        <div className={styles.shareGrid}>
          <div className={styles.messagePanel}>
            <div className={styles.messageHeader}>
              <div className={styles.bubbleIcon}><MessageCircle size={20} aria-hidden="true" /></div>
              <div><strong>WhatsApp message preview</strong><small>Prepared for your review—not sent</small></div>
            </div>
            <div className={styles.chatBackground}>
              <div className={styles.chatBubble}>
                <p>Welcome to Casa Serena! Here is your digital guest guide with arrival information, house rules, check-out details and local tips:</p>
                <span className={styles.chatLink}>{guestUrl || "Preparing guide link..."}</span>
                <p className={styles.demoDisclaimer}>This is a demonstration, not a real reservation message.</p>
              </div>
            </div>
            <div className={styles.panelActions}>
              {whatsappUrl ? (
                <a className={styles.whatsappAction} href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={18} aria-hidden="true" />
                  Open WhatsApp composer
                </a>
              ) : <span className={styles.disabledAction}>Preparing WhatsApp link…</span>}
              <p className={styles.hint}>You choose the recipient and press Send. GetStayGuide does not send anything automatically in this demo.</p>
            </div>
          </div>
          <div className={styles.qrPanel}>
            <div className={styles.messageHeader}>
              <div className={styles.bubbleIcon}><QrCode size={20} aria-hidden="true" /></div>
              <div><strong>Printed guest QR code</strong><small>Point a phone camera at the code</small></div>
            </div>
            <div className={styles.qrDisplay}>
              <span className={styles.qrEyebrow}>WELCOME TO</span>
              <strong>Casa Serena</strong>
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImage} width={184} height={184} alt="QR code opening the Casa Serena sample guest guide" />
              ) : <div className={styles.qrPlaceholder} role="status">Generating QR code…</div>}
              <span className={styles.qrCaption}>Scan to explore your guest guide</span>
            </div>
            <div className={styles.qrActions}>
              <button type="button" onClick={copyGuestLink} disabled={!guestUrl} className={styles.copyAction}>
                <Copy size={17} aria-hidden="true" /> Copy guest link
              </button>
              <button type="button" onClick={saveQr} disabled={!qrImage} className={styles.saveAction}>
                Download QR
              </button>
            </div>
            {copyNotice && <p className={styles.feedback} role="status">{copyNotice}</p>}
            <input className={styles.linkInput} type="text" aria-label="Sample guest-guide URL" readOnly value={guestUrl} onFocus={(e) => e.currentTarget.select()} />
          </div>
        </div>
      </section>

      <section className={styles.guidePreview} aria-labelledby="inside-heading">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>WHAT GUESTS RECEIVE</span>
          <h2 id="inside-heading">Everything in one place</h2>
          <p>These sample sections come from the same fictional guide that opens through WhatsApp or QR.</p>
        </div>
        <div className={styles.accordions}>
          {guideSections.map((section) => (
            <details key={section.id} className={styles.detail}>
              <summary>{section.title}<span>+</span></summary>
              <div className={styles.markdown}><ReactMarkdown>{section.body}</ReactMarkdown></div>
            </details>
          ))}
        </div>
        <Link href="/g/casa-serena" className={styles.guideBottomLink}>Explore the complete mobile guest guide <ArrowRight size={17} aria-hidden="true" /></Link>
      </section>

      <section className={styles.offer}>
        <div>
          <span className={styles.offerTag}>DONE-FOR-YOU GUEST GUIDE</span>
          <h2>One property. One beautiful guest experience.</h2>
          <p>A branded mobile guide, owner-approved property information, shareable guest link, QR code and setup walkthrough.</p>
          <p className={styles.terms}>£99 is a one-time setup price. Any ongoing hosting, support or subscription terms are agreed before purchase.</p>
        </div>
        <div className={styles.priceCard}>
          <span>ONE-TIME SETUP</span>
          <strong>£99</strong>
          <a href="mailto:abdelhaktirha@gmail.com?subject=GetStayGuide%20%C2%A399%20guest%20guide%20enquiry" className={styles.primaryAction}>
            Ask about your property <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><ShieldCheck size={17} aria-hidden="true" /> Demonstration only: no private guest information or live WhatsApp automation.</div>
        <Link href="/">GetStayGuide home</Link>
      </footer>
    </main>
  );
}
