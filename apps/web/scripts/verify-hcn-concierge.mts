/**
 * Explicitly opt-in, Preview-only real HCN concierge acceptance.
 * Uses the built-in sample guide: no guest history, real customer data,
 * generated credentials or payment operations.
 */
import { demoProperties } from "@stayguide/shared";
import { aiAnswer } from "../lib/concierge";

if (process.env.HCN_PREVIEW_CONCIERGE_ACCEPTANCE === "1") {
  if (process.env.VERCEL_ENV !== "preview") throw new Error("Concierge QA is Preview-only");
  if (process.env.AI_PROVIDER !== "openai-compatible" ||
      new URL(process.env.AI_BASE_URL || "https://invalid.example").hostname !== "api.hcnsec.cn" ||
      !process.env.AI_API_KEY || !process.env.AI_MODEL)
    throw new Error("Concierge QA provider is not fully configured");

  const started = Date.now();
  const result = await aiAnswer(demoProperties[0], "When is the check-out time?", "English");
  const took = Date.now() - started;
  // Sample check-out comes from the trusted structured property, not the model.
  const trusted = demoProperties[0].checkOut;
  const correct = result.answer.includes(trusted) && !result.escalate &&
    result.citations.length > 0 && !result.answer.includes("I'm sorry");
  console.log("HCN concierge QA durationMs=" + took +
    " citations=" + result.citations.length +
    " nonEscalated=" + !result.escalate +
    " matchesTrustedCheckout=" + result.answer.includes(trusted));
  if (!correct) throw new Error("HCN concierge failed live sample-guide factual answer acceptance");
} else {
  console.log("HCN concierge acceptance disabled");
}
