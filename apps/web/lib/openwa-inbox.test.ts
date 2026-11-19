import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { invitation } from "./openwa-inbox";
import { POST as webhook } from "../app/api/v1/whatsapp/webhook/route";
import { GET, POST } from "../app/api/v1/whatsapp/inbox/route";
const auth=vi.hoisted(()=>({user:{id:"",email:"owner@example.test",emailVerified:true}}));
vi.mock("@/lib/session",()=>({requireHost:async()=>auth}));
const pg=new PGlite();
const guest="12025550101", sender="12025550102", secret="a".repeat(32);
const owner=crypto.randomUUID();
beforeAll(async()=>{
  setQueryOverride(async(text,params)=>(await pg.query(text,params)).rows as Record<string,unknown>[]);
  for(const sql of splitStatements(readFileSync(new URL("../db/schema.sql",import.meta.url),"utf8"))) await pg.exec(sql);
  await query("INSERT INTO users (id,email) VALUES ($1,$2)",[owner,auth.user.email]);
  await query("INSERT INTO properties (id,owner_id,slug,data) VALUES ('qa',$1,'qa','{}')",[owner]);
  auth.user.id=owner;
  for(const [k,v] of Object.entries({OPENWA_PILOT_GUEST:guest,OPENWA_PILOT_SENDER:sender,OPENWA_WEBHOOK_SECRET:secret,OPENWA_HOST_EMAILS:auth.user.email,OPENWA_SESSION_ID:"qa",OPENWA_BASE_URL:"https://example.test",OPENWA_API_KEY:"qa"})) vi.stubEnv(k,v);
});
afterAll(async()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();setQueryOverride(null);await pg.close();});
function event(body:string,id=crypto.randomUUID(),from=guest,sign=secret) {
  const raw=JSON.stringify({event:"message.received",sessionId:"qa",data:{body,id,from:from+"@c.us",chatId:from+"@c.us",to:sender+"@c.us",type:"chat",isGroup:false,fromMe:false,timestamp:Math.floor(Date.now()/1000)}});
  return webhook(new Request("https://example.test/hook",{method:"POST",body:raw,headers:{"X-OpenWA-Signature":"sha256="+createHmac("sha256",sign).update(raw).digest("hex")}}));
}
it("binds consent to the property, authenticates callbacks, deduplicates and isolates dashboard replies",async()=>{
  const invite=await invitation(owner,"qa",guest);
  const code=invite.match(/JOIN ([a-f0-9]+)/)![1];
  expect((await event("JOIN "+code,crypto.randomUUID(),guest,"wrong")).status).toBe(401);
  await event("before consent");
  await event("JOIN "+code);
  await event("unrelated",crypto.randomUUID(),"12025550109");
  const id=crypto.randomUUID();
  await event("Test question",id);await event("Test question",id);
  const inbox=await (await GET()).json();
  expect(inbox.messages).toHaveLength(1);expect(inbox.messages[0].unread).toBe(true);
  const gateway=vi.fn().mockResolvedValue(new Response("provider error",{status:400}));
  vi.stubGlobal("fetch",gateway);
  const key=crypto.randomUUID();
  const reply=()=>POST(new Request("https://example.test/reply",{method:"POST",body:JSON.stringify({action:"reply",id:inbox.thread.id,text:"Test reply",key})}));
  auth.user.id=crypto.randomUUID();
  expect((await (await GET()).json()).thread).toBeNull();
  expect((await reply()).ok).toBe(false);expect(gateway).not.toHaveBeenCalled();
  auth.user.id=owner;
  expect(await (await reply()).json()).toEqual({status:"unknown"});
  expect((await reply()).status).toBe(409);expect(gateway).toHaveBeenCalledTimes(1);
  await event("STOP");await event("after stop");expect((await (await GET()).json()).messages).toHaveLength(2);
});
