import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { demoCopy, demoLanguages, fictionalDemos, type DemoLocale } from "@/lib/fictional-demos";
import { demoLocalNotes } from "@/lib/fictional-demo-local-notes";
import { DemoShareLink } from "@/components/demo-share-link";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Fictional guest guide | GetStayGuide", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const property = fictionalDemos.find((p) => p.slug === slug);
  if (!property) notFound();
  const locale: DemoLocale = lang && Object.hasOwn(demoLanguages, lang) ? lang as DemoLocale : "en";
  const t = demoCopy[locale];
  const localNotes = locale === "en" ? property.detail : demoLocalNotes[locale][fictionalDemos.indexOf(property)];
  const sections = [[t.arrival,t.arrivalText],[t.wifi,t.wifiText],[t.rules,t.rulesText],[t.checkout,t.checkoutText],[t.support,t.supportText]];
  return <main className={styles.root} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    <nav className={styles.nav}><Link href="/demo/previews">{t.back}</Link><Link href="/">GetStayGuide</Link></nav>
    <div className={styles.notice} role="note">{t.notice}</div>
    <nav className={styles.languages} aria-label="Language">{Object.entries(demoLanguages).map(([key,label]) => <Link key={key} href={`?lang=${key}`} hrefLang={key} aria-current={key === locale ? "page" : undefined}>{label}</Link>)}</nav>
    <header className={styles.hero}><p>{property.type} · {property.location}</p><h1>{property.name}</h1><h2>{t.welcome}</h2><p>15:00 · 11:00</p></header>
    <div className={styles.sections}>{sections.map(([title,body],index) => <details key={title} open={index === 0}><summary>{title}</summary><p>{body}</p></details>)}
      <details open><summary>{t.local}</summary><p>{localNotes}</p></details>
    </div>
    <div className={styles.actions}><DemoShareLink name={property.name} label={t.share} /><a href="mailto:abdelhaktirha@gmail.com?subject=Founding%20Five%20%2449%20USD%20guide%20enquiry">{t.enquire}</a></div>
    <footer className={styles.footer}><p>{t.offer}</p><Link href="/legal/terms">Terms</Link> · <Link href="/legal/privacy">Privacy</Link></footer>
  </main>;
}
