"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { siteText, type SiteLocale } from "@/lib/site-i18n";
import { estimateSupportSavings } from "@/lib/support-savings";

/**
 * A decision aid, NOT a measurement of customer results. All values are
 * visitor-controlled assumptions and no inputs leave the browser.
 */
export function GuestSupportValue({ locale }: { locale: SiteLocale }) {
  const t = siteText(locale).supportValue;
  const [questions, setQuestions] = useState(20);
  const [minutes, setMinutes] = useState(4);
  const [reduction, setReduction] = useState(30);
  const [hourlyCost, setHourlyCost] = useState(18);
  const estimate = estimateSupportSavings({
    weeklyQuestions: questions,
    minutesPerQuestion: minutes,
    reductionPercent: reduction,
    hourlyStaffCostGbp: hourlyCost,
  });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });

  return (
    <div id="guest-support-value">
      <div className="eyebrow">{t.eyebrow}</div>
      <h2>{t.title}</h2>
      <p className="muted" style={{ maxWidth: 760, marginTop: 10 }}>{t.body}</p>

      <div className="feature-grid" style={{ marginTop: 26 }}>
        {t.examples.map(([title, description], index) => (
          <div className="feature-card" key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ))}
      </div>

      <div className="split" style={{ alignItems: "start", marginTop: 40 }}>
        <div>
          <h3>{t.calculatorTitle}</h3>
          <p className="muted" style={{ marginTop: 12 }}>{t.calculatorBody}</p>
          <Link className="button secondary" href="/demo" style={{ marginTop: 16 }}>
            {t.cta}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="card panel form-grid">
          <label>
            {t.questions}: <strong>{questions}</strong>
            <input type="range" min="0" max="200" step="5" value={questions}
              onChange={(event) => setQuestions(Number(event.target.value))} />
          </label>
          <label>
            {t.minutes}: <strong>{minutes}</strong>
            <input type="range" min="1" max="15" step="1" value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))} />
          </label>
          <label>
            {t.reduction}: <strong>{reduction}%</strong>
            <input type="range" min="0" max="80" step="5" value={reduction}
              onChange={(event) => setReduction(Number(event.target.value))} />
          </label>
          <label>
            {t.cost}: <strong>£{hourlyCost}</strong>
            <input type="range" min="10" max="40" step="1" value={hourlyCost}
              onChange={(event) => setHourlyCost(Number(event.target.value))} />
          </label>
          <div className="row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 15, flexWrap: "wrap" }}>
            <span className="muted">{t.hours}</span>
            <strong style={{ fontSize: 27, color: "var(--teal)" }}>
              {number.format(estimate.hoursPerMonth)} h
            </strong>
          </div>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <span className="muted">{t.labour}</span>
            <strong style={{ fontSize: 27, color: "var(--teal)" }}>
              {currency.format(estimate.labourValueGbpPerMonth)}
            </strong>
          </div>
          <small className="muted" style={{ lineHeight: 1.5 }}>{t.assumptions}</small>
        </div>
      </div>
    </div>
  );
}
