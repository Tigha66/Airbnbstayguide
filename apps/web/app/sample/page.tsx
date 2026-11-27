import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing";
import { WalkthroughEnquiryForm } from "@/components/walkthrough-enquiry-form";
import { isSiteLocale, siteDir, siteText, type SiteLocale } from "@/lib/site-i18n";

export const dynamic = "force-dynamic";
const pageCopy: Record<SiteLocale,{title:string;body:string}> = {
  en:{title:"A free sample, shaped around your property.",body:"Share your property website and we’ll prepare an unofficial guide concept using public information only. We’ll review every request ourselves; this form does not send email automatically."},
  fr:{title:"Un exemple gratuit, pensé pour votre logement.",body:"Partagez le site de votre logement. Nous préparerons un concept non officiel à partir d’informations publiques uniquement. Chaque demande sera examinée manuellement, sans e-mail automatique."},
  es:{title:"Una muestra gratuita para tu alojamiento.",body:"Comparte la web de tu alojamiento y prepararemos un concepto no oficial usando solo información pública. Revisaremos cada solicitud manualmente; no se envían correos automáticamente."},
  de:{title:"Ein kostenloses Beispiel für Ihre Unterkunft.",body:"Teilen Sie die Website Ihrer Unterkunft. Wir erstellen einen inoffiziellen Konzeptentwurf ausschließlich aus öffentlichen Informationen. Jede Anfrage wird manuell geprüft; es wird keine E-Mail automatisch versendet."},
  ar:{title:"نموذج مجاني مصمم لعقارك.",body:"شارك موقع العقار وسنعد تصورًا غير رسمي باستخدام المعلومات العامة فقط. سنراجع كل طلب يدويًا، ولن يُرسل أي بريد إلكتروني تلقائيًا."},
};
export default async function SamplePage({searchParams}:{searchParams:Promise<{lang?:string}>}) {
  const params=await searchParams; const locale=isSiteLocale(params.lang||"")?params.lang as SiteLocale:"en"; const t=siteText(locale);
  return <div className="marketing" lang={locale} dir={siteDir(locale)}><MarketingNav locale={locale}/><main className="marketing-section center" style={{maxWidth:900}}><div className="eyebrow">GETSTAYGUIDE · PERSONAL SAMPLE</div><h1>{pageCopy[locale].title}</h1><p>{pageCopy[locale].body}</p><WalkthroughEnquiryForm locale={locale}/><p><Link className="text-link" href="/demo">{t.hero.secondary}</Link></p></main><MarketingFooter locale={locale}/></div>;
}
