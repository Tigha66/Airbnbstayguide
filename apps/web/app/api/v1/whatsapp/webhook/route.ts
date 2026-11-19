import { pilot, receive, validSignature } from "@/lib/openwa-inbox";
import { consumeRateLimit } from "@/lib/repo";

export async function POST(request: Request) {
  const cfg = pilot();
  if (!cfg) return new Response(null,{status:404});
  const sig = request.headers.get("x-openwa-signature");
  if (!sig || !/^sha256=[a-f0-9]{64}$/.test(sig)) return new Response(null,{status:401});
  const reader = request.body?.getReader();
  if (!reader) return new Response(null,{status:400});
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); return new Response(null,{status:413}); }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks);
  if (!validSignature(body,sig,cfg.secret)) return new Response(null,{status:401});
  if (!(await consumeRateLimit("wa:webhook:"+cfg.session,240,60))) return new Response(null,{status:429});
  let event;
  try { event=JSON.parse(body.toString("utf8")); } catch { return new Response(null,{status:400}); }
  await receive(event);
  return new Response(null,{status:204});
}
