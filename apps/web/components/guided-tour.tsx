"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Home, MessageCircle, QrCode, Sparkles } from "lucide-react";
import { MarketingNav, MarketingFooter } from "./marketing";
import { onboardingText } from "@/lib/onboarding-i18n";
import { localeBase, siteDir, type SiteLocale } from "@/lib/site-i18n";

const icons = [Home, BookOpen, Sparkles, QrCode, MessageCircle];
export function GuidedTour({ locale }: { locale: SiteLocale }) {
  const t = onboardingText[locale];
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Casa Serena");
  const [reviewed, setReviewed] = useState(false);
  const [published, setPublished] = useState(false);
  const [done, setDone] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = t.steps[step];
  const Icon = icons[step];
  function go(next: number) {
    setStep(next);
    setDone(false);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return <div className="marketing" lang={locale} dir={siteDir(locale)}>
    <MarketingNav locale={locale} />
    <main className="tour-page">
      <div className="tour-intro"><div className="eyebrow">{t.sample}</div><h1>{t.title}</h1><p>{t.intro}</p></div>
      <nav className="tour-steps" aria-label={t.tour}>
        {t.steps.map((s, i) => <button key={s.title} onClick={() => go(i)} aria-current={step === i ? "step" : undefined} className={step === i ? "active" : ""}><span>{i + 1}</span>{s.title}</button>)}
      </nav>
      <section className="tour-card" aria-labelledby="tour-heading">
        <div className="tour-copy">
          <div className="eyebrow">{t.step} {step + 1} / {t.steps.length}</div>
          <h2 ref={heading} id="tour-heading" tabIndex={-1}>{current.title}</h2>
          <p>{current.body}</p><p className="tour-task">{current.task}</p>
          {step === 2 && <Link className="button secondary" href="/demo" target="_blank" rel="noopener noreferrer">{t.openDemo}<ArrowRight size={16} /></Link>}
          <div className="row tour-controls">
            <button className="button secondary" disabled={step === 0} onClick={() => go(step - 1)}>{t.previous}</button>
            {step < 4 ? <button className="button" onClick={() => go(step + 1)}>{t.next}<ArrowRight size={16} /></button> : <button className="button" onClick={() => setDone(true)}><CheckCircle2 size={16}/>{t.complete}</button>}
          </div>
        </div>
        <div className="tour-preview">
          <span className="stat-icon"><Icon size={23} /></span><small>{t.sample}</small>
          <h3>{step === 0 ? name || "Casa Serena" : current.preview}</h3><p>{current.detail}</p>
          {step === 0 && <label className="stack">{current.task.split(/[→←]/)[0]}<input aria-label={current.title} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>}
          {step === 1 && <button className={`button ${reviewed ? "" : "secondary"}`} aria-pressed={reviewed} onClick={() => setReviewed(v => !v)}>{reviewed && <CheckCircle2 size={16}/>} {current.task}</button>}
          {step === 2 && <div className="tour-languages" dir="auto">🇬🇧 🇫🇷 🇪🇸 🇩🇪 🇸🇦<Link className="text-link" href="/demo" target="_blank" rel="noopener noreferrer">{current.action}<ArrowRight size={16}/></Link></div>}
          {step === 3 && <><button className={`button ${published ? "secondary" : ""}`} aria-pressed={published} onClick={() => setPublished(v => !v)}>{published ? <CheckCircle2 size={16}/> : <QrCode size={16}/>} {current.task.split(/[→←]/)[0]}</button>{published && <Link className="text-link" href="/demo" target="_blank" rel="noopener noreferrer">{t.openDemo}<ArrowRight size={16}/></Link>}</>}
          {step === 4 && <div className="tour-inbox"><MessageCircle size={18}/><p>{t.steps[2].task.split(/[→←]/).at(-1)}</p><span className="pill">{name || "Casa Serena"}</span></div>}
        </div>
      </section>
      {done && <div role="status" className="notice tour-complete"><CheckCircle2 size={20}/> {t.complete}<button className="text-link" onClick={() => { setName("Casa Serena"); setReviewed(false); setPublished(false); go(0); }}>{t.restart}</button></div>}
      <section className="tour-cta"><h2>{t.trial}</h2><p>{t.terms}</p><small>{t.scope}</small><div className="row"><Link className="button" href="/login?mode=register">{t.trial}<ArrowRight size={16}/></Link><Link className="button secondary" href="/dashboard">{t.workspace}</Link><Link className="text-link" href={`${localeBase(locale)}/pricing`}>{t.viewPlans}</Link></div></section>
    </main><MarketingFooter locale={locale}/>
  </div>;
}
