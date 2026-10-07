"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { plans, priceFor, type Plan } from "@stayguide/shared";
import { Logo } from "./ui";
export function MarketingNav() {
  return (
    <header className="marketing-nav">
      <Logo />
      <nav>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/demo">Guest demo</Link>
        <Link href="/login">Log in</Link>
        <Link href="/dashboard" className="button">
          Explore StayGuide
          <ArrowUpRight size={14} />
        </Link>
      </nav>
    </header>
  );
}
export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <Logo />
      <span>Made for thoughtful hosts.</span>
      <nav>
        <Link href="/blog">Journal</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
      </nav>
    </footer>
  );
}
export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [quantity, setQuantity] = useState(1);
  return (
    <>
      <div
        className="filter-bar"
        style={{ maxWidth: 660, margin: "30px auto" }}
      >
        <label style={{ minWidth: 210 }}>
          Your little places: {quantity}
          <input
            aria-label="Number of properties"
            type="range"
            min="1"
            max="20"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <div className="tabs">
          <button
            className={!annual ? "active" : ""}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={annual ? "active" : ""}
            onClick={() => setAnnual(true)}
          >
            Yearly · 2 months free
          </button>
        </div>
      </div>
      <div className="pricing-grid" style={{ textAlign: "left" }}>
        {(Object.keys(plans) as Plan[]).map((key) => (
          <div
            className={`card pricing-card ${key === "pro" ? "featured" : ""}`}
            key={key}
          >
            <div className="eyebrow">{plans[key].name}</div>
            <h3>
              {key === "free"
                ? "Start your hosting story"
                : key === "starter"
                  ? "A little help goes a long way"
                  : "Make every stay your own"}
            </h3>
            <div className="price">
              £{priceFor(key, key === "free" ? 1 : quantity, annual)}
            </div>
            <small>
              {annual ? "per year" : "per month"} ·{" "}
              {key === "free"
                ? "1 property"
                : `${quantity} ${quantity === 1 ? "property" : "properties"}`}
            </small>
            <ul>
              <li>
                <Check size={14} />
                Beautiful digital guidebooks
              </li>
              <li>
                <Check size={14} />
                {plans[key].messages} AI messages / property / month
              </li>
              <li>
                <Check size={14} />
                Guest extras · 5% platform fee
              </li>
              <li>
                <Check size={14} />
                Offline guest access
              </li>
              {key === "pro" && (
                <li>
                  <Check size={14} />
                  Your branding & custom domain
                </li>
              )}
            </ul>
            <Link
              className={`button ${key === "pro" ? "" : "secondary"}`}
              href="/dashboard"
            >
              Explore the demo
              <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>
      <p
        className="muted"
        style={{ fontSize: 11, textAlign: "center", marginTop: 22 }}
      >
        Prices in GBP (£), per property. Secure payment by Stripe. Cancel any
        time.
      </p>
    </>
  );
}
export function RoiCalculator() {
  const [stays, setStays] = useState(20);
  const [uptake, setUptake] = useState(25);
  return (
    <div className="split" style={{ alignItems: "center" }}>
      <div>
        <div className="eyebrow">A LITTLE MORE FROM EVERY STAY</div>
        <h2>
          Small extras.
          <br />A lovely difference.
        </h2>
        <p className="muted">
          An earlier check-in. A homemade breakfast. Thoughtful touches can be
          good for guests and good for your business.
        </p>
      </div>
      <div className="card panel form-grid">
        <label>
          Monthly stays: {stays}
          <input
            type="range"
            min="1"
            max="100"
            value={stays}
            onChange={(e) => setStays(Number(e.target.value))}
          />
        </label>
        <label>
          Guests choosing an extra: {uptake}%
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={uptake}
            onChange={(e) => setUptake(Number(e.target.value))}
          />
        </label>
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            borderTop: "1px solid var(--line)",
            paddingTop: 15,
          }}
        >
          <span className="muted">Estimated extra revenue</span>
          <strong
            style={{
              fontSize: 35,
              fontFamily: "var(--serif)",
              color: "var(--teal)",
            }}
          >
            £{Math.round(((stays * uptake) / 100) * 30 * 0.95)}
            <small style={{ fontSize: 12 }}>/mo</small>
          </strong>
        </div>
        <small style={{ fontSize: 10 }}>
          Illustration at £30 per extra, after the 5% platform fee, before
          processing fees and fulfillment costs. Not a revenue guarantee.
        </small>
      </div>
    </div>
  );
}
