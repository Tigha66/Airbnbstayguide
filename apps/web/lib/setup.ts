import type { Property } from "@stayguide/shared";

/** The guided setup steps a host completes to publish a great guest guide. */
export const setupStepKeys = [
  "details",
  "arrival",
  "wifi",
  "rules",
  "checkout",
  "extras",
  "publish",
] as const;
export type SetupStepKey = (typeof setupStepKeys)[number];

/** English labels; the dashboard translates them with tr(). */
export const setupStepLabels: Record<SetupStepKey, string> = {
  details: "Property details",
  arrival: "Arrival & check-in",
  wifi: "Wi-Fi",
  rules: "House rules",
  checkout: "Checkout",
  extras: "Extras",
  publish: "Publish",
};

/**
 * A section counts once it holds real content: a non-empty body with no unresolved
 * [bracketed prompts] left over from a starter template. So a freshly templated guide
 * shows the steps as still to-do until the host writes their own details in.
 */
const hasBody = (property: Property, type: string) =>
  property.sections.some(
    (s) => s.type === type && !/\[[^\]]*\]/.test(s.body) && s.body.trim().length > 0,
  );

/** Whether each setup step is complete for a property. Pure, so it runs the same in demo and live mode. */
export function setupStatus(property: Property): Record<SetupStepKey, boolean> {
  return {
    details:
      property.location.trim().length >= 2 &&
      property.checkIn.trim().length > 0 &&
      property.checkOut.trim().length > 0,
    arrival: hasBody(property, "arrival"),
    wifi: property.wifi.trim().length > 0 || hasBody(property, "wifi"),
    rules: hasBody(property, "rules"),
    checkout: hasBody(property, "checkout"),
    extras: property.extras.length > 0,
    publish: property.status === "published",
  };
}

export type SetupStep = { key: SetupStepKey; label: string; done: boolean };
export function setupSteps(property: Property): SetupStep[] {
  const status = setupStatus(property);
  return setupStepKeys.map((key) => ({ key, label: setupStepLabels[key], done: status[key] }));
}

/** How many of the setup steps are complete, as a 0–100 percentage. */
export function setupPercent(property: Property): number {
  const status = setupStatus(property);
  const done = setupStepKeys.filter((key) => status[key]).length;
  return Math.round((done / setupStepKeys.length) * 100);
}
