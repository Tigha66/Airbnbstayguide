import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, ExternalLink, House, MapPin, MessageCircle, QrCode } from "lucide-react";
import { salesPreviewProperties } from "@/lib/sales-preview-data";
import { fictionalDemos } from "@/lib/fictional-demos";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Guest guide demonstrations | GetStayGuide",
  description: "Explore five fictional accommodation guides and three independent guest-guide concepts.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className={styles.root}>
      <nav className={styles.nav}><Link href="/" className={styles.brand}>GetStayGuide<span>.</span></Link><Link href="/demo/whatsapp" className={styles.topLink}>WhatsApp walkthrough <ExternalLink size={15} aria-hidden="true" /></Link></nav>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>THREE PROPERTY-SPECIFIC SALES CONCEPTS</span>
        <h1>Show the guest experience, not another PDF.</h1>
        <p>Explore how one finished mobile welcome guide could work for three existing UK holiday accommodation businesses, with practical sections, a shareable link, a QR code and manual WhatsApp sharing.</p>
        <div className={styles.tags}><span><Check size={15} aria-hidden="true" /> No guest login</span><span><QrCode size={15} aria-hidden="true" /> Scannable QR</span><span><MessageCircle size={15} aria-hidden="true" /> Manual WhatsApp link</span></div>
      </section>
      <div className={styles.disclaimer}>These independent demonstrations use publicly listed property information and have not been authorised, verified or endorsed by the accommodation operators. They contain no private arrival or Wi-Fi credentials.</div>
      <section className={styles.grid} aria-label="Fictional accommodation demonstrations">
        {fictionalDemos.map((property) => <article key={property.slug} className={styles.card}><div className={styles.cardBody}>
          <h2>{property.type}</h2><strong>{property.name}</strong><p>{property.location} · Fictional demonstration</p>
          <p>Arrival, sample Wi-Fi, rules, local notes, checkout and support. Core instructions in English, French, Spanish, German and Arabic.</p>
          <Link className={styles.open} href={`/demo/examples/${property.slug}`}>Open {property.name}</Link>
        </div></article>)}
      </section>
      <section className={styles.grid}>
        {salesPreviewProperties.map((property,index)=>(
          <article key={property.slug} className={styles.card}>
            <div className={styles.cover} style={{ background: property.accent }}>
              <span>CONCEPT {String(index+1).padStart(2,"0")}</span>
              <House size={68} strokeWidth={1} aria-hidden="true" />
              <strong>{property.name}</strong>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.operator}>{property.operator}</span>
              <p className={styles.location}><MapPin size={15} aria-hidden="true" />{property.shortLocation}</p>
              <p className={styles.intro}>{property.intro}</p>
              <Link href={"/demo/preview/"+property.slug} className={styles.open}>Open interactive preview <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </article>
        ))}
      </section>
      <section className={styles.offer}><div><span>ONE FINISHED GUIDE FOR ONE PROPERTY</span><h2>$49 USD one-time setup</h2><p>Owner-approved guest information, mobile-friendly guide, QR code, manual WhatsApp link sharing and handover. Founding Five: first five customers, one consolidated revision and 12 months of hosting from publication. No automatic renewal; your account remains on Free.</p></div><a href="mailto:abdelhaktirha@gmail.com?subject=GetStayGuide%20%2449%20USD%20guide%20enquiry">Enquire about an order <ArrowRight size={16} aria-hidden="true" /></a></section>
      <footer className={styles.footer}>Independent concepts only · No OpenWA messages or payments are initiated by this page.</footer>
    </main>
  );
}
