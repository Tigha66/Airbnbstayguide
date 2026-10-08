import { Building2, Check, Mail } from "lucide-react";
import { hotelPlan, plans } from "@stayguide/shared";

/** Where "Talk to us" goes. Set NEXT_PUBLIC_SALES_URL (e.g. a Cal.com booking link) to change it. */
export const salesUrl =
  process.env.NEXT_PUBLIC_SALES_URL ||
  "mailto:hello@getstayguide.com?subject=" + encodeURIComponent("Hotel & Multi-Unit plan");

/** The sales-led plan for hotels, resorts and multi-unit operators. */
export function HotelPlanCard({ current = false }: { current?: boolean }) {
  return (
    <div className="card pricing-card hotel-card">
      <div className="eyebrow">
        <Building2 size={13} style={{ display: "inline", marginInlineEnd: 6, verticalAlign: "-2px" }} />
        {plans.hotel.name}
      </div>
      <h3>{hotelPlan.tagline}</h3>
      <div className="price">Custom</div>
      <small>Tailored to your rooms and units · billed monthly or yearly</small>
      <ul>
        {hotelPlan.features.map((f) => (
          <li key={f}>
            <Check size={14} />
            {f}
          </li>
        ))}
      </ul>
      {current ? (
        <span className="button secondary" aria-disabled="true">
          Your current plan
        </span>
      ) : (
        <a className="button" href={salesUrl}>
          <Mail size={14} />
          Talk to us
        </a>
      )}
    </div>
  );
}
