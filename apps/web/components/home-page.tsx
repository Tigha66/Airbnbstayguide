import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Languages, Leaf, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { demoProperties } from "@stayguide/shared";
import { MarketingNav, MarketingFooter, Pricing, RoiCalculator } from "./marketing";
import { TryGuide } from "./try-guide";
import { guestLanguageChips, siteDir, siteText, type SiteLocale } from "@/lib/site-i18n";

const pointIcons = [BookOpen, MessageCircle, ShieldCheck];

/** The marketing homepage, in any of the website languages. */
export function HomePage({ locale }: { locale: SiteLocale }) {
  const t = siteText(locale);
  return (
    <div className="marketing" lang={locale} dir={siteDir(locale)}>
      <MarketingNav locale={locale} />
      <main>
        <section className="marketing-hero">
          <div>
            <div className="eyebrow">{t.hero.eyebrow}</div>
            <h1>{t.hero.title1}</h1>
            <p>{t.hero.body}</p>
            <div className="row">
              <Link className="button" href="/try">
                {t.hero.primary}
                <ArrowRight size={16} />
              </Link>
              <Link className="button secondary" href="/demo">
                {t.hero.secondary}
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <small>
              <ShieldCheck size={13} style={{ display: "inline", marginInlineEnd: 5 }} />
              {t.hero.small}
            </small>
          </div>
          <div className="marketing-visual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demoProperties[0].image} alt="Casa Serena" fetchPriority="high" />
            <div className="marketing-overlay">
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t.hero.overlayEyebrow}
                </div>
                <p className="overlay-title">{t.hero.overlayTitle}</p>
                <p>{t.hero.overlayBody}</p>
              </div>
              <Link href="/demo" className="icon-button" aria-label={t.hero.secondary}>
                <ArrowUpRight size={19} />
              </Link>
            </div>
          </div>
        </section>

        <TryGuide title={t.try.title} body={t.try.body} compact />

        <div className="marketing-band">
          <section className="marketing-section center" id="how-it-works">
            <div className="eyebrow">{t.how.eyebrow}</div>
            <h2>
              {t.how.title1}
              <br />
              {t.how.title2}
            </h2>
            <p>{t.how.body}</p>
            <div className="feature-grid">
              {t.how.steps.map(([number, title, copy]) => (
                <div className="feature-card" key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Multilingual guests: one of StayGuide's main advantages. */}
        <section className="marketing-section languages-section" id="languages">
          <div className="languages-copy">
            <div className="eyebrow">
              <Languages size={13} style={{ display: "inline", marginInlineEnd: 6, verticalAlign: "-2px" }} />
              {t.langs.eyebrow}
            </div>
            <h2>{t.langs.title}</h2>
            <p className="muted">{t.langs.body}</p>
            <ul className="languages-points">
              {t.langs.points.map(([title, copy], i) => {
                const Icon = pointIcons[i] ?? Sparkles;
                return (
                  <li key={title}>
                    <span className="stat-icon">
                      <Icon size={17} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <p>{copy}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link className="button" href="/demo">
              {t.langs.cta}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="languages-visual" aria-hidden="true">
            <div className="languages-phone">
              <div className="languages-phone-top">
                <span>Casa Serena</span>
                <span className="languages-pill">🌐 {t.langs.chipsLabel}</span>
              </div>
              <div className="bubble host" dir="auto">
                {t.langs.demoQuestion}
              </div>
              <div className="bubble" dir="auto">
                {t.langs.demoAnswer}
                <span className="citation">
                  <Sparkles size={10} style={{ display: "inline", marginInlineEnd: 4 }} />
                  {t.langs.demoTag}
                </span>
              </div>
            </div>
            <div className="languages-chips">
              {guestLanguageChips.map((name) => (
                <span key={name} className="languages-chip" lang={name === "العربية" ? "ar" : undefined}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section">
          <RoiCalculator locale={locale} />
        </section>
        <section className="marketing-section center">
          <div className="eyebrow">{t.pricingSection.eyebrow}</div>
          <h2>{t.pricingSection.title}</h2>
          <p>{t.pricingSection.body}</p>
          <Pricing locale={locale} />
        </section>
        <section className="marketing-section center">
          <div className="eyebrow">{t.faq.eyebrow}</div>
          <h2>{t.faq.title}</h2>
          <div className="faq">
            {t.faq.items.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="marketing-section">
          <div className="marketing-cta">
            <Leaf size={30} style={{ margin: "0 auto 20px" }} />
            <h2>
              {t.cta.title1}
              <br />
              {t.cta.title2}
            </h2>
            <p>{t.cta.body}</p>
            <Link href="/dashboard" className="button cream">
              {t.cta.button}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "StayGuide",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            inLanguage: locale,
            description: t.meta.description,
            url: "https://www.getstayguide.com",
          }),
        }}
      />
    </div>
  );
}

/** The pricing page, in any of the website languages. */
export function PricingPage({ locale }: { locale: SiteLocale }) {
  const t = siteText(locale);
  return (
    <div className="marketing" lang={locale} dir={siteDir(locale)}>
      <MarketingNav locale={locale} />
      <main className="marketing-section center">
        <div className="eyebrow">{t.pricingPage.eyebrow}</div>
        <h2>{t.pricingPage.title}</h2>
        <p>{t.pricingPage.body}</p>
        <Pricing locale={locale} />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
