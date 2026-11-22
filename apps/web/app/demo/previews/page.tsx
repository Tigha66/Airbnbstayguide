import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, ExternalLink, House, MapPin, MessageCircle, QrCode } from "lucide-react";
import { salesPreviewProperties } from "@/lib/sales-preview-data";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Independent property guide concepts | GetStayGuide",
  description: "Explore independent digital guest-guide concepts with manual WhatsApp sharing and QR codes.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className={styles.root}>
      <nav className={styles.nav}><Link href="/" className={styles.brand}>GetStayGuide<span>.</span></Link><Link href="/demo/whatsapp" className={styles.topLink}>WhatsApp walkthrough <ExternalLink size={15} aria-hidden="true" /></Link></nav>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>{salesPreviewProperties.length} PROPERTY-SPECIFIC SALES CONCEPTS</span>
        <h1>Show the guest experience, not another PDF.</h1>
        <p>Explore how a mobile welcome guide could work for UK holiday accommodation businesses, with practical sections, a shareable link, a QR code and manual WhatsApp sharing.</p>
        <div className={styles.tags}><span><Check size={15} aria-hidden="true" /> No guest login</span><span><QrCode size={15} aria-hidden="true" /> Scannable QR</span><span><MessageCircle size={15} aria-hidden="true" /> Manual WhatsApp link</span></div>
      </section>
      <div className={styles.disclaimer}>These independent demonstrations use publicly listed property information and have not been authorised, verified or endorsed by the accommodation operators. They contain no private arrival or Wi-Fi credentials.</div>
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
      <section className={styles.offer}><div><span>ONE FINISHED GUIDE FOR ONE PROPERTY</span><h2>£99 one-time setup</h2><p>Owner-approved guest information, mobile-friendly guide, QR code, manual WhatsApp link sharing and handover. Hosting and ongoing terms agreed before purchase.</p></div><a href="mailto:abdelhaktirha@gmail.com?subject=GetStayGuide%20%C2%A399%20guide%20enquiry">Enquire about an order <ArrowRight size={16} aria-hidden="true" /></a></section>
      <footer className={styles.footer}>Independent concepts only · No OpenWA messages or payments are initiated by this page.</footer>
    </main>
  );
}