"use client";
import { useEffect, useState } from "react";

type ReceiptStatus = "processing" | "authorized" | "paid" | "closed" | "refunded";
const messages: Record<string, Record<ReceiptStatus, string>> = {
  en: {
    processing: "Payment confirmation is still pending. Check with your host before paying again.",
    authorized: "Your card is authorized. Your host must approve the extra before it is charged.",
    paid: "Your payment is confirmed. Thank you!",
    closed: "This checkout is closed. Check with your host before starting another payment.",
    refunded: "Your refund is confirmed. Your bank may take a few days to show it.",
  },
  fr: {
    processing: "La confirmation du paiement est en attente. Consultez votre hôte avant de payer à nouveau.",
    authorized: "Votre carte est autorisée. Votre hôte doit approuver l’extra avant le débit.",
    paid: "Votre paiement est confirmé. Merci !",
    closed: "Ce paiement est clôturé. Consultez votre hôte avant de recommencer.",
    refunded: "Votre remboursement est confirmé. Votre banque peut mettre quelques jours à l’afficher.",
  },
  es: {
    processing: "La confirmación del pago está pendiente. Consulta a tu anfitrión antes de volver a pagar.",
    authorized: "Tu tarjeta está autorizada. Tu anfitrión debe aprobar el extra antes del cobro.",
    paid: "Tu pago está confirmado. ¡Gracias!",
    closed: "Este pago está cerrado. Consulta a tu anfitrión antes de iniciar otro.",
    refunded: "Tu reembolso está confirmado. Tu banco puede tardar unos días en mostrarlo.",
  },
  de: {
    processing: "Die Zahlungsbestätigung steht noch aus. Fragen Sie Ihren Gastgeber, bevor Sie erneut bezahlen.",
    authorized: "Ihre Karte ist autorisiert. Ihr Gastgeber muss das Extra vor der Abbuchung bestätigen.",
    paid: "Ihre Zahlung ist bestätigt. Vielen Dank!",
    closed: "Dieser Zahlungsvorgang ist geschlossen. Fragen Sie Ihren Gastgeber, bevor Sie erneut bezahlen.",
    refunded: "Ihre Erstattung ist bestätigt. Ihre Bank benötigt möglicherweise einige Tage zur Anzeige.",
  },
  ar: {
    processing: "تأكيد الدفع لا يزال قيد الانتظار. تواصل مع مضيفك قبل الدفع مرة أخرى.",
    authorized: "تم حجز المبلغ على بطاقتك. يجب أن يوافق مضيفك على الإضافة قبل خصمه.",
    paid: "تم تأكيد الدفع. شكرًا لك!",
    closed: "تم إغلاق عملية الدفع هذه. تواصل مع مضيفك قبل بدء عملية أخرى.",
    refunded: "تم تأكيد استرداد المبلغ. قد يستغرق ظهوره لدى البنك بضعة أيام.",
  },
};

/** A return URL never proves payment. Only display state recorded after verification. */
export function ExtraReceipt({ slug, sessionId, language }: { slug: string; sessionId: string | null; language: string }) {
  const [status, setStatus] = useState<ReceiptStatus>("processing");
  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const check = async () => {
      try {
        const res = await fetch(`/api/v1/guides/${encodeURIComponent(slug)}/extras/status?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!res.ok) return;
        const body = await res.json();
        if (controller.signal.aborted) return;
        if (["authorized", "paid", "closed", "refunded"].includes(body.status)) { setStatus(body.status); return; }
        if (++attempts < 8) timer = setTimeout(check, 2000);
      } catch { /* Keep an honest pending message when offline. */ }
    };
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [slug, sessionId]);
  return <div className="notice" role="status" style={{ marginBottom: 20 }}>{(messages[language] ?? messages.en)[status]}</div>;
}
