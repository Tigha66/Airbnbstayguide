import type { SiteLocale } from "./site-i18n";

type ConfirmationCopy = {
  subject: string;
  body: (starts: string, ends: string) => string;
};

const copy: Record<SiteLocale, ConfirmationCopy> = {
  en: {
    subject: "Your Founding Five guide hosting is active",
    body: (starts, ends) => `We received your one-time $49 USD Founding Five payment.\nSupplier is not VAT registered. No UK VAT charged.

Your guest guide was published on ${starts}, so its 12-month basic hosting runs through ${ends}. Your StayGuide account remains on the Free plan. This purchase does not add a subscription and will not renew automatically.

If you need help, reply to this email.`,
  },
  fr: {
    subject: "Votre hébergement Founding Five est actif",
    body: (starts, ends) => `Nous avons reçu votre paiement unique Founding Five de $49 USD.\nSupplier is not VAT registered. No UK VAT charged.

Votre guide voyageur a été publié le ${starts}; son hébergement de base de 12 mois court jusqu’au ${ends}. Votre compte StayGuide reste sur le forfait gratuit. Cet achat n’ajoute aucun abonnement et ne sera pas renouvelé automatiquement.

Pour obtenir de l’aide, répondez à cet e-mail.`,
  },
  es: {
    subject: "Tu alojamiento Founding Five está activo",
    body: (starts, ends) => `Hemos recibido tu pago único de $49 USD por Founding Five.\nSupplier is not VAT registered. No UK VAT charged.

Tu guía para huéspedes se publicó el ${starts}; sus 12 meses de alojamiento básico terminan el ${ends}. Tu cuenta de StayGuide sigue en el plan gratuito. Esta compra no añade una suscripción y no se renovará automáticamente.

Si necesitas ayuda, responde a este correo.`,
  },
  de: {
    subject: "Ihr Founding-Five-Hosting ist aktiv",
    body: (starts, ends) => `Wir haben Ihre einmalige Founding-Five-Zahlung über $49 USD erhalten.\nSupplier is not VAT registered. No UK VAT charged.

Ihr Gästeguide wurde am ${starts} veröffentlicht; das zwölfmonatige Basis-Hosting läuft bis zum ${ends}. Ihr StayGuide-Konto bleibt im kostenlosen Tarif. Dieser Kauf fügt kein Abo hinzu und verlängert sich nicht automatisch.

Wenn Sie Hilfe benötigen, antworten Sie auf diese E-Mail.`,
  },
  ar: {
    subject: "تم تفعيل استضافة Founding Five",
    body: (starts, ends) => `استلمنا دفعتك لمرة واحدة بقيمة $49 USD لعرض Founding Five.\nSupplier is not VAT registered. No UK VAT charged.

نُشر دليل الضيوف الخاص بك بتاريخ ${starts}، وتستمر الاستضافة الأساسية لمدة 12 شهراً حتى ${ends}. سيظل حساب StayGuide على الخطة المجانية. لا تضيف هذه العملية اشتراكاً ولن تتجدد تلقائياً.

إذا احتجت إلى المساعدة، رُد على هذه الرسالة.`,
  },
};

export function foundingFiveConfirmationEmail(input: {
  locale: SiteLocale;
  startsAt: string;
  endsAt: string;
}) {
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(input.locale, { dateStyle: "long", timeZone: "UTC", calendar: "gregory", numberingSystem: "latn" }).format(new Date(value));
  const template = copy[input.locale] ?? copy.en;
  return {
    subject: template.subject,
    text: template.body(formatDate(input.startsAt), formatDate(input.endsAt)),
  };
}
