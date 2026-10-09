/**
 * Allowed status changes for extra requests the guest pays for in person (cash, transfer…).
 * Online payments are moved by Stripe instead (capture, release, refund) in the route.
 */
const manualTransitions: Record<string, readonly string[]> = {
  pending: ["approved", "declined"],
  approved: ["paid"],
  paid: [],
  declined: [],
  refunded: [],
};
/** True when a host may move a manually-paid extra request from `from` to `to` (never declined → paid). */
export function canChangeManualExtra(from: string, to: string) {
  return (manualTransitions[from] ?? []).includes(to);
}
