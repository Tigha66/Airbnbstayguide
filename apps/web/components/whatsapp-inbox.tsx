"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLocale } from "./app-locale";

type Message = {id:string;role:string;body:string;status:string;created_at:string;unread:boolean};
type Data = {draftsEnabled?:boolean;thread:{id:string;name:string;active:boolean}|null;messages?:Message[]};
const labels = {
  en:["WhatsApp inbox","Unread","Mark as read","Suggest reply","Send reply","Guest","You","Consent required","Check the conversation before trying again.","Draft reply"],
  ar:["صندوق واتساب","غير مقروءة","تحديد كمقروءة","اقتراح رد","إرسال الرد","الضيف","أنت","يلزم موافقة الضيف","تحقق من المحادثة قبل المحاولة مجدداً.","مسودة الرد"],
  fr:["Boîte WhatsApp","Non lu","Marquer comme lu","Suggérer une réponse","Envoyer","Voyageur","Vous","Consentement requis","Vérifiez la conversation avant de réessayer.","Brouillon"],
  es:["Bandeja de WhatsApp","Sin leer","Marcar como leído","Sugerir respuesta","Enviar","Huésped","Tú","Se requiere consentimiento","Comprueba la conversación antes de reintentar.","Borrador"],
  de:["WhatsApp-Postfach","Ungelesen","Als gelesen markieren","Antwort vorschlagen","Senden","Gast","Sie","Einwilligung erforderlich","Vor einem neuen Versuch den Verlauf prüfen.","Antwortentwurf"]
};
export function WhatsAppInbox() {
  const {locale}=useAppLocale();
  const l=labels[locale as keyof typeof labels] || labels.en;
  const [data,setData]=useState<Data|null>(null);
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  const lock=useRef(false);
  const key=useRef("");
  const url="/api/v1/whatsapp/inbox";
  const reload=useCallback(async()=>{
    try {const r=await fetch(url,{cache:"no-store"});setData(r.ok ? await r.json() : null);} catch {setData(null);}
  },[]);
  useEffect(()=>{const first=setTimeout(reload,0);const timer=setInterval(reload,10000);return ()=>{clearTimeout(first);clearInterval(timer);};},[reload]);
  if (!data?.thread) return null;
  const thread=data.thread;
  async function act(action:string,message?:string) {
    if (lock.current) return;
    lock.current=true;setBusy(true);setError(false);
    try {
      if (!key.current) key.current=crypto.randomUUID();
      const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,id:thread.id,key:key.current,text:draft,message})});
      if (!res.ok) throw Error();
      if (action==="suggest") {setDraft((await res.json()).reply);key.current="";}
      if (action==="reply") {setDraft("");key.current="";}
      await reload();
    } catch {setError(true);} finally {lock.current=false;setBusy(false);}
  }
  return <section className="card panel" dir={locale==="ar"?"rtl":"ltr"}>
    <h2>{l[0]} · {thread.name}</h2>
    {data.messages?.map(m=><article key={m.id} style={{padding:"8px 0",overflowWrap:"anywhere"}}>
      <small>{m.role==="guest"?l[5]:l[6]} · {new Date(m.created_at).toLocaleString(locale)} · {m.status}</small>
      <p dir="auto" style={{whiteSpace:"pre-wrap"}}>{m.body}</p>
      {m.unread && <button disabled={busy} onClick={()=>act("read",m.id)}>{l[1]} · {l[2]}</button>}
    </article>)}
    {thread.active ? <><textarea aria-label={l[9]} placeholder={l[9]} disabled={busy} maxLength={2000} value={draft}
      onChange={e=>{setDraft(e.target.value);key.current="";}} style={{width:"100%"}}/>
      <div className="row" style={{flexWrap:"wrap",gap:8}}>
      {data.draftsEnabled && <button disabled={busy} onClick={()=>act("suggest")}>{l[3]}</button>}
      <button disabled={busy || !draft.trim()} onClick={()=>act("reply")}>{l[4]}</button></div></> : <p>{l[7]}</p>}
    {error && <p role="alert">{l[8]}</p>}
  </section>;
}
