import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { applyOnlineExtraAction } from "./extra-payments";

const request = { id: "extra-1", status: "pending", payment_intent_id: "pi_1", price: 3000 };
function provider(status = "requires_capture") {
  const pi = { id: "pi_1", status, amount: 3000, currency: "usd", latest_charge: "ch_1", metadata: { app: "stayguide", extra_request_id: "extra-1" } };
  const fake = {
    paymentIntents: { retrieve: vi.fn(async () => pi), capture: vi.fn(async () => ({ ...pi, status: "succeeded" })), cancel: vi.fn(async () => ({ ...pi, status: "canceled" })) },
    refunds: { list: vi.fn(async () => ({ data: [] as { status: string; amount: number }[], has_more: false })), create: vi.fn(async () => ({ id: "re_1", status: "succeeded" })) },
  };
  return { fake, client: fake as unknown as Stripe, pi };
}
describe("extra payment recovery", () => {
  it("uses a stable operation key and recovers capture after a lost DB save", async () => {
    const { fake, client, pi } = provider();
    expect(await applyOnlineExtraAction(client, request, "approved")).toBe("paid");
    expect(fake.paymentIntents.capture).toHaveBeenCalledWith("pi_1", {}, { idempotencyKey: "stayguide:extra:extra-1:approved" });
    pi.status = "succeeded";
    expect(await applyOnlineExtraAction(client, request, "approved")).toBe("paid");
    expect(fake.paymentIntents.capture).toHaveBeenCalledTimes(1);
  });
  it("recovers a released hold without issuing a second cancellation", async () => {
    const { fake, client, pi } = provider();
    expect(await applyOnlineExtraAction(client, request, "declined")).toBe("declined");
    pi.status = "canceled";
    expect(await applyOnlineExtraAction(client, request, "declined")).toBe("declined");
    expect(fake.paymentIntents.cancel).toHaveBeenCalledTimes(1);
  });
  it("refuses a payment bound to another request or a changed amount", async () => {
    const { fake, client, pi } = provider();
    pi.metadata.extra_request_id = "another-extra";
    await expect(applyOnlineExtraAction(client, request, "approved")).rejects.toThrow("does not match");
    pi.metadata.extra_request_id = "extra-1";
    pi.amount = 1;
    await expect(applyOnlineExtraAction(client, request, "approved")).rejects.toThrow("does not match");
    expect(fake.paymentIntents.capture).not.toHaveBeenCalled();
  });
  it("does not release money after a competing capture succeeded", async () => {
    const { fake, client } = provider("succeeded");
    await expect(applyOnlineExtraAction(client, request, "declined")).rejects.toThrow("cannot be released");
    expect(fake.paymentIntents.cancel).not.toHaveBeenCalled();
  });
  it("reconciles a successful refund even after the idempotency retention window", async () => {
    const { fake, client } = provider("succeeded");
    fake.refunds.list.mockResolvedValue({ data: [{ status: "succeeded", amount: 3000 }], has_more: false });
    expect(await applyOnlineExtraAction(client, { ...request, status: "paid" }, "refunded")).toBe("refunded");
    expect(fake.refunds.create).not.toHaveBeenCalled();
  });
  it("does not turn a pending refund into confirmed reimbursement or submit another", async () => {
    const { fake, client } = provider("succeeded");
    fake.refunds.list.mockResolvedValue({ data: [{ status: "pending", amount: 3000 }], has_more: false });
    await expect(applyOnlineExtraAction(client, { ...request, status: "paid" }, "refunded")).rejects.toThrow("already processing");
    expect(fake.refunds.create).not.toHaveBeenCalled();
  });
  it("reverses the destination transfer and fee with a retry-stable full refund", async () => {
    const { fake, client } = provider("succeeded");
    expect(await applyOnlineExtraAction(client, { ...request, status: "paid" }, "refunded")).toBe("refunded");
    expect(fake.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_1", reverse_transfer: true, refund_application_fee: true }), { idempotencyKey: "stayguide:extra:extra-1:refunded" });
  });
});
