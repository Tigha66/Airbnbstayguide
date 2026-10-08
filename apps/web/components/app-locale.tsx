"use client";
import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { makeTr, type Tr } from "@/lib/app-i18n";
import { localeNames, siteLocales, type SiteLocale } from "@/lib/site-i18n";

const LocaleContext = createContext<{ locale: SiteLocale; tr: Tr }>({ locale: "en", tr: makeTr("en") });

/** Provides the host app's language to every component below it. */
export function AppLocaleProvider({ locale, children }: { locale: SiteLocale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={{ locale, tr: makeTr(locale) }}>{children}</LocaleContext.Provider>;
}
export function useAppLocale() {
  return useContext(LocaleContext);
}

/** Saves the language (same cookie as the website) and re-renders the page in it. */
export function AppLanguageMenu({ compact = false }: { compact?: boolean }) {
  const { locale, tr } = useAppLocale();
  const router = useRouter();
  return (
    <label className={`language-menu ${compact ? "compact" : ""}`}>
      <Globe size={15} aria-hidden="true" />
      <span className="sr-only">{tr("Language")}</span>
      <select
        aria-label={tr("Language")}
        value={locale}
        onChange={(e) => {
          const next = e.target.value as SiteLocale;
          document.cookie = `sg_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          try {
            localStorage.setItem("stayguide-language", next);
          } catch {
            /* private browsing */
          }
          router.refresh();
        }}
      >
        {siteLocales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code].flag} {compact ? code.toUpperCase() : localeNames[code].label}
          </option>
        ))}
      </select>
    </label>
  );
}
