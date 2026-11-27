import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Unofficial property guide sample", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

type Preview = {
  propertyName: string; managerName: string; location: string; accent: string; summary: string;
  highlights: string[]; arrival: string; departure: string; recommendations: string[]; sourceUrl: string;
};
export default async function PropertySamplePage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{token?:string}>}) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.SAMPLE_PREVIEWS_ENABLED !== "true") notFound();
  const [{slug},{token}] = await Promise.all([params,searchParams]);
  if (!/^[a-z0-9-]{2,80}$/.test(slug) || !token || token.length < 32 || token.length > 128) notFound();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rows = await query<Preview>(
    `SELECT property_name AS "propertyName", manager_name AS "managerName", location, accent, summary,
            highlights, arrival, departure, recommendations, source_url AS "sourceUrl"
       FROM property_sample_previews
      WHERE slug=$1 AND token_hash=$2 AND expires_at > now()
      LIMIT 1`,
    [slug,tokenHash],
  );
  const guide=rows[0]; if(!guide) notFound();
  const facts=Array.isArray(guide.highlights)?guide.highlights:[];
  const recommendations=Array.isArray(guide.recommendations)?guide.recommendations:[];
  return <main style={{minHeight:"100vh",background:"#f4f5f2",color:"#17221f",padding:"24px 16px 60px"}}>
    <article style={{maxWidth:760,margin:"0 auto",background:"#fff",borderRadius:22,overflow:"hidden",boxShadow:"0 16px 48px #14251a14"}}>
      <header style={{padding:"14px 20px",background:"#17221f",color:"#fff",fontSize:12,fontWeight:700,letterSpacing:".08em"}}>UNOFFICIAL SAMPLE · NOT APPROVED OR OPERATED BY THE PROPERTY</header>
      <section style={{padding:"30px clamp(20px,6vw,48px) 28px",borderTop:`6px solid ${guide.accent}`}}>
        <p style={{fontSize:13,letterSpacing:".08em",textTransform:"uppercase",color:guide.accent,fontWeight:700,margin:0}}>{guide.managerName} · SAMPLE STYLING ONLY</p>
        <h1 style={{fontSize:"clamp(32px,7vw,52px)",lineHeight:1.05,margin:"14px 0 10px"}}>{guide.propertyName}</h1>
        <p style={{fontSize:18,color:"#596560",margin:"0 0 20px"}}>{guide.location}</p>
        <p style={{fontSize:17,lineHeight:1.65,maxWidth:620}}>{guide.summary}</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:18}}><span style={{borderRadius:999,padding:"7px 12px",background:"#eff3ef",fontSize:13}}>Mobile-friendly concept</span><span style={{borderRadius:999,padding:"7px 12px",background:"#eff3ef",fontSize:13}}>No property photos used</span></div>
      </section>
      <section style={{padding:"4px clamp(20px,6vw,48px) 28px"}}>
        <h2 style={{fontSize:22}}>About the stay</h2><ul style={{paddingInlineStart:22,lineHeight:1.8}}>{facts.map((fact,i)=><li key={i}>{fact}</li>)}</ul>
      </section>
      <section style={{padding:"4px clamp(20px,6vw,48px) 28px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:14}}>
        <div style={{border:"1px solid #e4e9e5",borderRadius:16,padding:18}}><p style={{color:guide.accent,fontWeight:700,margin:"0 0 8px"}}>ARRIVAL</p><p style={{lineHeight:1.6,margin:0}}>{guide.arrival}</p></div>
        <div style={{border:"1px solid #e4e9e5",borderRadius:16,padding:18}}><p style={{color:guide.accent,fontWeight:700,margin:"0 0 8px"}}>DEPARTURE</p><p style={{lineHeight:1.6,margin:0}}>{guide.departure}</p></div>
      </section>
      <section style={{padding:"4px clamp(20px,6vw,48px) 32px"}}>
        <h2 style={{fontSize:22}}>Explore nearby</h2><ul style={{paddingInlineStart:22,lineHeight:1.8}}>{recommendations.map((item,i)=><li key={i}>{item}</li>)}</ul>
      </section>
      <footer style={{padding:"22px clamp(20px,6vw,48px)",background:"#f7f8f6",borderTop:"1px solid #e7ebe7",fontSize:13,lineHeight:1.7}}>
        <p>This independent concept uses limited information from the public source below. It is not a live guest guide, booking service, endorsement or authorised property page. Arrival details marked for host confirmation must be supplied by the operator before publication. No logo, property photography, private access details or guest data are included.</p>
        <p>Public information source: <a href={guide.sourceUrl} target="_blank" rel="noreferrer" style={{color:guide.accent,overflowWrap:"anywhere"}}>{guide.sourceUrl}</a></p>
        <Link href="/pricing#founding-five" style={{display:"inline-block",marginTop:8,color:guide.accent,fontWeight:700}}>See the $49 USD Founding Five offer →</Link>
      </footer>
    </article>
  </main>;
}
