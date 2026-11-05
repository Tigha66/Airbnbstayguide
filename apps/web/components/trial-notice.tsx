"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAppLocale } from "./app-locale";
import { useLive } from "@/lib/demo-store";
import { onboardingText } from "@/lib/onboarding-i18n";
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
