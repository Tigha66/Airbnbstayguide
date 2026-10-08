"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Globe } from "lucide-react";
import { plans, priceFor, selfServePlans, CURRENCY, CURRENCY_SYMBOL } from "@stayguide/shared";
import {
  fillSite,
  isSiteLocale,
  localeBase,
  localeNames,
  siteLocales,
  siteText,
  type SiteLocale,
  type SiteText,
} from "@/lib/site-i18n";
import { HotelPlanCard } from "./hotel-plan";
import { Logo } from "./ui";

/** Remembers the visitor's website language (read by the language redirect in proxy.ts). */
function rememberLocale(locale: SiteLocale) {
  document.cookie = `sg_lang=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    // The guest demo opens in the same language.
    localStorage.setItem("stayguide-language", locale);
  } catch {
    /* private browsing */
  }
}

/** Switches the website language, staying on the same page where a translation exists. */
export function LanguageMenu({ locale }: { locale: SiteLocale }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  return (
    <label className="language-menu">
      <Globe size={15} aria-hidden="true" />
      <span className="sr-only">{siteText(locale).nav.language}</span>
      <select
        value={locale}
        aria-label={siteText(locale).nav.language}
        onChange={(e) => {
          const next = e.target.value as SiteLocale;
          rememberLocale(next);
          const [, first, ...rest] = pathname.split("/");
          const page = "/" + (isSiteLocale(first) ? rest : [first, ...rest]).filter(Boolean).join("/");
          const translated = page === "/" || page === "/pricing";
          router.push(`${localeBase(next)}${translated ? (page === "/" ? "" : page) : ""}` || "/");
        }}
      >
        {siteLocales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code].flag} {localeNames[code].label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MarketingNav({ locale = "en" }: { locale?: SiteLocale }) {
  const t = siteText(locale).nav;
  const base = localeBase(locale);
  return (
    <header className="marketing-nav">
      <Logo href={base || "/"} />
      <nav>
        <Link href={`${base}/#how-it-works`}>{t.howItWorks}</Link>
        <Link href={`${base}/pricing`}>{t.pricing}</Link>
        <Link href="/demo">{t.demo}</Link>
        <Link href="/login">{t.login}</Link>
        <LanguageMenu locale={locale} />
        <Link href="/dashboard" className="button">
          {t.explore}
          <ArrowUpRight size={14} />
        </Link>
      </nav>
    </header>
  );
}

export function MarketingFooter({ locale = "en" }: { locale?: SiteLocale }) {
  const t = siteText(locale).footer;
  return (
    <footer className="marketing-footer">
      <Logo />
      <span>{t.tagline}</span>
      <nav>
        <Link href="/blog">{t.journal}</Link>
        <Link href="/legal/privacy">{t.privacy}</Link>
        <Link href="/legal/terms">{t.terms}</Link>
      </nav>
    </footer>
  );
}

export function Pricing({ locale = "en" }: { locale?: SiteLocale }) {
  const all = siteText(locale);
  const t = all.pricing;
  const [annual, setAnnual] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const titles: Record<(typeof selfServePlans)[number], string> = { free: t.freeTitle, starter: t.starterTitle, pro: t.proTitle };
  const unit = (n: number) => `${n} ${n === 1 ? t.property : t.properties}`;
  return (
    <>
      <div className="filter-bar" style={{ maxWidth: 660, margin: "30px auto" }}>
        <label style={{ minWidth: 210 }}>
          {t.places}: {quantity}
          <input
            aria-label={t.places}
            type="range"
            min="1"
            max="20"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <div className="tabs">
          <button className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>
            {t.monthly}
          </button>
          <button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>
            {t.yearly}
          </button>
        </div>
      </div>
      <div className="pricing-grid" style={{ textAlign: "start" }}>
        {selfServePlans.map((key) => (
          <div className={`card pricing-card ${key === "pro" ? "featured" : ""}`} key={key}>
            <div className="eyebrow">{key === "free" ? t.planFree : plans[key].name}</div>
            <h3>{titles[key]}</h3>
            <div className="price">
              {CURRENCY_SYMBOL}
              {priceFor(key, key === "free" ? 1 : quantity, annual)}
            </div>
            <small>
              {annual ? t.perYear : t.perMonth} · {key === "free" ? unit(1) : unit(quantity)}
            </small>
            <ul>
              <li>
                <Check size={14} />
                {t.guidebooks}
              </li>
              <li>
                <Check size={14} />
                {fillSite(t.aiMessages, { n: plans[key].messages.toLocaleString(locale === "ar" ? "en" : locale) })}
              </li>
              <li>
                <Check size={14} />
                {t.languages}
              </li>
              <li>
                <Check size={14} />
                {t.extras}
              </li>
              <li>
                <Check size={14} />
                {t.offline}
              </li>
              {key === "pro" && (
                <li>
                  <Check size={14} />
                  {t.priority}
                </li>
              )}
            </ul>
            <Link className={`button ${key === "pro" ? "" : "secondary"}`} href="/dashboard">
              {t.cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        ))}
        <HotelPlanCard text={all.hotel} />
      </div>
      <p className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 22 }}>
        {fillSite(t.note, { code: CURRENCY.toUpperCase(), symbol: CURRENCY_SYMBOL })}
      </p>
    </>
  );
}

export function RoiCalculator({ locale = "en" }: { locale?: SiteLocale }) {
  const t: SiteText["roi"] = siteText(locale).roi;
  const [stays, setStays] = useState(20);
  const [uptake, setUptake] = useState(25);
  return (
    <div className="split" style={{ alignItems: "center" }}>
      <div>
        <div className="eyebrow">{t.eyebrow}</div>
        <h2>
          {t.title1}
          <br />
          {t.title2}
        </h2>
        <p className="muted">{t.body}</p>
      </div>
      <div className="card panel form-grid">
        <label>
          {t.stays}: {stays}
          <input type="range" min="1" max="100" value={stays} onChange={(e) => setStays(Number(e.target.value))} />
        </label>
        <label>
          {t.uptake}: {uptake}%
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={uptake}
            onChange={(e) => setUptake(Number(e.target.value))}
          />
        </label>
        <div className="row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 15 }}>
          <span className="muted">{t.estimate}</span>
          <strong style={{ fontSize: 35, fontFamily: "var(--serif)", color: "var(--teal)" }}>
            {CURRENCY_SYMBOL}
            {Math.round(((stays * uptake) / 100) * 30 * 0.95)}
            <small style={{ fontSize: 12 }}>{t.perMonth}</small>
          </strong>
        </div>
        <small style={{ fontSize: 10 }}>{fillSite(t.note, { price: `${CURRENCY_SYMBOL}30` })}</small>
      </div>
    </div>
  );
}
