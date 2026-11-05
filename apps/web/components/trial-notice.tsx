"use client";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { useAppLocale } from "./app-locale";
import { useLive } from "@/lib/demo-store";
import { dashboardOnboardingText, onboardingText } from "@/lib/onboarding-i18n";
import { localeBase } from "@/lib/site-i18n";
export function TrialNotice() {
  const { locale } = useAppLocale();
  const { live, user } = useLive();
  const t = onboardingText[locale];
  if (!live || !user?.trialEndsAt) return null;
  const ends = new Date(user.trialEndsAt);
  return <aside className="notice trial-notice" aria-label={t.active}>
    <Sparkles size={20}/><div><strong>{user.trialExpired ? t.expired : user.trialActive ? t.active : t.verify}</strong><p>{t.ends}: {ends.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}. {t.terms}</p><small>{t.scope}</small></div>
    <Link className="button secondary" href="/dashboard/billing">{t.viewPlans}</Link><Link className="text-link" href={`${localeBase(locale)}/tour`}>{t.learn}</Link>
  </aside>;
}


/** Keep onboarding visible for every account, including existing paid hosts. */
export function DashboardOnboarding() {
  const { locale, tr } = useAppLocale();
  const { checked, live, user } = useLive();
  const t = onboardingText[locale];
  const d = dashboardOnboardingText[locale];
  const trialAccount = Boolean(user?.trialEndsAt);
  return <section className="card panel dashboard-onboarding" aria-label={d.title}>
    <div className="dashboard-onboarding-copy">
      <div className="eyebrow"><BookOpen size={15} aria-hidden="true" /> {d.title}</div>
      <h2>{t.learn}</h2><p>{d.body}</p>
      <p><strong>{d.trialTitle}. </strong>{!checked ? t.loading : live && user
        ? trialAccount ? user.trialExpired ? t.expired : d.automatic : user.plan === "free" ? d.free : d.paid
        : t.terms}</p>
      {live && user && <small>{d.current}: {user.plan === "free" ? tr("Free") : user.plan === "hotel" ? tr("Hotel & Multi-Unit") : user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</small>}
    </div>
    <div className="dashboard-onboarding-actions">
      <Link className="button" href={`${localeBase(locale)}/tour`}>{d.title}</Link>
      {checked && <Link className="button secondary" href={live ? "/dashboard/billing" : "/login?mode=register"}>{live ? d.billing : t.trial}</Link>}
    </div>
  </section>;
}
