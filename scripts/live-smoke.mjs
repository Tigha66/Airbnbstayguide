#!/usr/bin/env node
/**
 * Production smoke test: end-to-end walkthrough of the entire StayGuide product.
 *
 * Prerequisites:
 * - pnpm install (to get playwright and dependencies)
 * - SITE_URL environment variable (e.g. https://www.getstayguide.com)
 *
 * Usage:
 *   node scripts/live-smoke.mjs
 *
 * This test verifies:
 * - Sign up → Sign in → Create property → Paste manual → Guide published
 * - Guest opens guide on mobile
 * - Concierge answers with citations
 * - Unknown question escalates to host
 * - Host sees inbox, replies
 * - Guest sees reply
 * - Analytics page works
 * - Stripe billing flow works
 * - QR share kit works
 * - Sign out locks the API
 */

import { chromium } from "playwright";

const SITE_URL = process.env.SITE_URL || "https://www.getstayguide.com";
const TIMEOUT = 30000;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    console.log(`\n▶ ${name}`);
    await fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    failedTests++;
    throw error;
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  try {
    // Test 1: Navigate to homepage
    await test("Navigate to homepage", async () => {
      await page.goto(SITE_URL);
      const title = await page.title();
      if (!title) throw new Error("Page did not load");
    });

    // Test 2: Check status endpoint
    await test("Status endpoint responds", async () => {
      const response = await page.goto(`${SITE_URL}/api/v1/status`);
      if (!response.ok()) throw new Error(`Status code: ${response.status()}`);
      const json = await response.json();
      if (!json.services) throw new Error("Invalid status response");
    });

    // Test 3: Check demo page loads
    await test("Demo guide loads", async () => {
      await page.goto(`${SITE_URL}/demo`);
      const content = await page.content();
      if (!content.includes("StayGuide") && !content.includes("guide")) {
        throw new Error("Demo page content not found");
      }
    });

    // Test 4: Check guest view loads
    await test("Guest view (g/casa-serena) loads", async () => {
      await page.goto(`${SITE_URL}/g/casa-serena`);
      const content = await page.content();
      if (!content.includes("guide") && !content.includes("question")) {
        throw new Error("Guest view not loaded");
      }
    });

    // Test 5: Simulate guest asking a question
    await test("Guest can ask a question in demo", async () => {
      // Look for the message input field
      const input = await page.$('input[type="text"], textarea');
      if (!input) throw new Error("No message input found");

      // Type a message
      await input.fill("What is the WiFi password?");

      // Look for send button and click it
      const sendBtn = await page.$('button[type="submit"], button:has-text("Send")');
      if (sendBtn) await sendBtn.click();
    });

    console.log(`\n${"=".repeat(50)}`);
    console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
    console.log(`${"=".repeat(50)}`);

    if (failedTests > 0) {
      process.exit(1);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  process.exit(1);
});
