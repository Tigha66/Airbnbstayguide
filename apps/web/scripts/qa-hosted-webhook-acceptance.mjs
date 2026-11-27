// Read QA-only credentials and endpoint through stdin. Never log them or persist them.
// Replays only an already-processed event; it must not create a new payment or entitlement.
import Stripe from "stripe";
import { createInterface } from "node:readline";

const input = createInterface({ input: process.stdin });
const config = JSON.parse(await new Promise((resolve) => input.once("line", resolve)));
input.close();
if (!/^sk_test_|^rk_test_/.test(config.secretKey) || config.expectedAccount !== "acct_1UfSytGLQPXVXXJZ")
  throw new Error("Only the dedicated QA sandbox is allowed");
const endpoint = new URL(config.endpoint);
if (endpoint.hostname !== "stayguide-isolated-qa-git-test-founding-fi-6322a7-hajabdelhak66.vercel.app" || endpoint.pathname !== "/api/stripe/webhook")
  throw new Error("Unexpected QA endpoint");
const stripe = new Stripe(config.secretKey);
if ((await stripe.accounts.retrieve()).id !== config.expectedAccount) throw new Error("QA account mismatch");
const event = await stripe.events.retrieve(config.eventId);
if (event.livemode || event.type !== "checkout.session.completed") throw new Error("Expected a sandbox checkout event");
const payload = JSON.stringify(event);
for (const kind of ["invalid-signature", "signed-replay", "duplicate-signed-replay"]) {
  const signature = kind === "invalid-signature" ? "t=1,v1=invalid" : stripe.webhooks.generateTestHeaderString({ payload, secret: config.webhookSecret });
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": signature },
    body: payload, signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
  console.log(JSON.stringify({ test: kind, httpStatus: response.status, result: body.result ?? body.error }));
  const expectedStatus = kind === "invalid-signature" ? 400 : 200;
  if (response.status !== expectedStatus || (expectedStatus === 200 && body.result !== "duplicate"))
    throw new Error("Hosted webhook acceptance failed");
}
