import { MarketingNav, MarketingFooter } from "@/components/marketing";
import { serviceStatus } from "@/lib/status";
export const dynamic = "force-dynamic";
export const metadata = { title: "Service status", robots: { index: false } };
export default async function Page() {
  const services = await serviceStatus();
  return (
    <div className="marketing">
      <MarketingNav />
      <main className="marketing-section status-page">
        <h1>Service status</h1>
        <p>Which live services this StayGuide deployment is connected to.</p>
        <ul className="status-list">
          {services.map((s) => (
            <li key={s.key} className={s.ok ? "ok" : "off"}>
              <span aria-hidden="true">{s.ok ? "●" : "○"}</span>
              <div>
                <strong>{s.label}</strong> <em>{s.ok ? "Connected" : "Not connected"}</em>
                <p>{s.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}
