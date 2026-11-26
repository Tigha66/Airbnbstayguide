"use client";

import { useState } from "react";

const copy = {
  en: { name:"Your name", email:"Email address", property:"Property name", url:"Property website (HTTPS)", submit:"Request my free sample", busy:"Sending…", note:"We’ll use the public information at this URL to prepare an unofficial sample concept. No email is sent automatically.", success:"Request received. We’ll review it manually.", error:"Please check the details and try again." },
  fr: { name:"Votre nom", email:"Adresse e-mail", property:"Nom du logement", url:"Site du logement (HTTPS)", submit:"Demander mon exemple gratuit", busy:"Envoi…", note:"Nous utiliserons les informations publiques de cette adresse pour préparer un exemple non officiel. Aucun e-mail n’est envoyé automatiquement.", success:"Demande reçue. Nous l’examinerons manuellement.", error:"Vérifiez les informations et réessayez." },
  es: { name:"Tu nombre", email:"Correo electrónico", property:"Nombre del alojamiento", url:"Web del alojamiento (HTTPS)", submit:"Solicitar mi muestra gratis", busy:"Enviando…", note:"Usaremos la información pública de esta dirección para preparar un ejemplo no oficial. No se envía ningún correo automáticamente.", success:"Solicitud recibida. La revisaremos manualmente.", error:"Revisa los datos e inténtalo de nuevo." },
  de: { name:"Ihr Name", email:"E-Mail-Adresse", property:"Name der Unterkunft", url:"Website der Unterkunft (HTTPS)", submit:"Kostenloses Beispiel anfordern", busy:"Wird gesendet…", note:"Wir verwenden öffentliche Informationen unter dieser Adresse für einen inoffiziellen Beispielentwurf. Es wird keine E-Mail automatisch versendet.", success:"Anfrage erhalten. Wir prüfen sie manuell.", error:"Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut." },
  ar: { name:"اسمك", email:"البريد الإلكتروني", property:"اسم العقار", url:"موقع العقار (HTTPS)", submit:"اطلب نموذجي المجاني", busy:"جارٍ الإرسال…", note:"سنستخدم المعلومات العامة في هذا الرابط لإعداد نموذج توضيحي غير رسمي. لن يُرسل أي بريد إلكتروني تلقائيًا.", success:"تم استلام الطلب وسنراجعه يدويًا.", error:"تحقق من البيانات وحاول مجددًا." },
} as const;

export function WalkthroughEnquiryForm({ locale }: { locale: keyof typeof copy }) {
  const t = copy[locale];
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: HTMLFormElement) {
    setBusy(true); setStatus("");
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/walkthrough", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(data) });
      if (!response.ok) throw new Error();
      form.reset(); setStatus(t.success);
    } catch { setStatus(t.error); }
    finally { setBusy(false); }
  }
  return <form onSubmit={event=>{event.preventDefault(); void submit(event.currentTarget);}} style={{display:"grid",gap:14,maxWidth:560,margin:"24px auto",textAlign:"start"}}>
    {([["name",t.name,"text"],["email",t.email,"email"],["propertyName",t.property,"text"],["propertyUrl",t.url,"url"]] as const).map(([key,label,type])=>
      <label key={key} style={{display:"grid",gap:6}}>{label}<input name={key} type={type} required maxLength={key==="email"?254:key==="propertyUrl"?2048:120} autoComplete={key==="name"?"name":key==="email"?"email":undefined} style={{minHeight:44,padding:"10px 12px",border:"1px solid #cbd5e1",borderRadius:8}} /></label>
    )}
    <label aria-hidden="true" style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0,0,0,0)"}}>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
    <small>{t.note}</small>
    <button className="button" disabled={busy}>{busy?t.busy:t.submit}</button>
    <p role="status" aria-live="polite">{status}</p>
  </form>;
}
