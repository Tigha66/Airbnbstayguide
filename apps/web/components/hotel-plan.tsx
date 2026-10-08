import { Building2, Check, Mail } from "lucide-react";
import { hotelPlan, plans } from "@stayguide/shared";

/** Translatable text for the Hotel card (English by default). */
export type HotelPlanText = {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: string;
  current: string;
  mailSubject: string;
};
const english: HotelPlanText = {
  name: plans.hotel.name,
  tagline: hotelPlan.tagline,
  price: "Custom",
  priceNote: "Tailored to your rooms and units · billed monthly or yearly",
  features: hotelPlan.features,
  cta: "Talk to us",
  current: "Your current plan",
  mailSubject: "Hotel & Multi-Unit plan",
};

/** Where "Talk to us" goes. Set NEXT_PUBLIC_SALES_URL (e.g. a Cal.com booking link) to change it. */
export const salesUrl = (subject = english.mailSubject) =>
  process.env.NEXT_PUBLIC_SALES_URL || "mailto:hello@getstayguide.com?subject=" + encodeURIComponent(subject);

/** The sales-led plan for hotels, resorts and multi-unit operators. */
export function HotelPlanCard({ current = false, text = english }: { current?: boolean; text?: HotelPlanText }) {
  return (
    <div className="card pricing-card hotel-card">
      <div className="eyebrow">
        <Building2 size={13} style={{ display: "inline", marginInlineEnd: 6, verticalAlign: "-2px" }} />
        {text.name}
      </div>
      <h3>{text.tagline}</h3>
      <div className="price">{text.price}</div>
      <small>{text.priceNote}</small>
      <ul>
        {text.features.map((f) => (
          <li key={f}>
            <Check size={14} />
            {f}
          </li>
        ))}
      </ul>
      {current ? (
        <span className="button secondary" aria-disabled="true">
          {text.current}
        </span>
      ) : (
        <a className="button" href={salesUrl(text.mailSubject)}>
          <Mail size={14} />
          {text.cta}
        </a>
      )}
    </div>
  );
}
