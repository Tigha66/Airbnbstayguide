/**
 * Privacy policy and terms of service. The only things left to fill in are the four values in
 * LEGAL_DETAILS below (they appear in square brackets on the pages until then).
 */
export const LEGAL_DETAILS = {
  companyName: "[COMPANY NAME]",
  companyAddress: "[COMPANY ADDRESS]",
  contactEmail: "[CONTACT EMAIL]",
  governingLaw: "[GOVERNING LAW]",
};

export const LEGAL_UPDATED = "9 October 2026";

/** Values still in [BRACKETS]: listed so they can't be forgotten before launch. */
export const legalPlaceholders = () => Object.entries(LEGAL_DETAILS).filter(([, v]) => /^\[.*\]$/.test(v)).map(([k]) => k);

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalPage = { title: string; intro: string; sections: LegalSection[] };

export function privacyPolicy(d = LEGAL_DETAILS): LegalPage {
  return {
    title: "Privacy policy",
    intro: `This policy explains how ${d.companyName} ("StayGuide", "we") handles personal data when hosts use the StayGuide dashboard and when guests open a StayGuide guide.`,
    sections: [
      {
        heading: "Who is responsible",
        paragraphs: [
          `For host accounts, ${d.companyName}, ${d.companyAddress}, is the controller. For guest data inside a host's guide (questions, extra requests), the host is the controller and we process it on the host's behalf. Contact for all privacy questions and requests: ${d.contactEmail}.`,
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "Hosts: name, email address and profile picture from Google sign-in; the guides, house manuals, photos and extras you add; your plan and subscription status; your notification setting; AI usage counts.",
          "Guests: the questions you ask the concierge and the answers (with the language), and, if you request an extra, the name, contact detail and note you enter. Guests don't need an account.",
          "Payments: Stripe processes card details. We only receive the Stripe customer, subscription and payment identifiers and the payment status; we never see or store card numbers.",
          "Technical data: IP addresses are used to limit abuse and are stored only as a one-way hash, deleted within two days. Our hosting provider keeps request logs. Aggregated page-view statistics are counted per guide per day without identifying visitors.",
        ],
      },
      {
        heading: "Why we use it (legal bases)",
        paragraphs: [
          "To provide the service you signed up for (contract): accounts, guides, the concierge, inbox, extras, billing and email notifications.",
          "To keep the service secure and working (legitimate interest): rate limits, abuse prevention, error monitoring and aggregated statistics.",
          "To meet legal obligations: invoices and tax records kept by our payment provider.",
          "We don't sell personal data and don't use it for advertising.",
        ],
      },
      {
        heading: "AI processing",
        paragraphs: [
          "Guest questions and the guide's content are sent to our AI provider to write answers, organise house manuals and translate guides. The provider processes this text only to return the result. Answers come only from the host's guide; questions the guide doesn't answer are passed to the host.",
        ],
      },
      {
        heading: "Service providers",
        paragraphs: [
          "Vercel (hosting, optional website analytics without cookies), Neon (database), Google (sign-in), Hugging Face or another configured AI inference provider (AI answers and translations), Stripe (subscriptions and payments for extras), Resend (notification emails), Sentry (error monitoring, without cookies, request bodies or user details), and Unsplash (sample photos). Some of these providers are located outside your country, including in the United States; transfers are covered by the providers' standard contractual clauses or equivalent safeguards.",
        ],
      },
      {
        heading: "How long we keep data",
        paragraphs: [
          "Guest chat messages: 12 months, then deleted automatically.",
          "Guest names, contact details and notes on extra requests: 6 months, then removed automatically (the request amount and status stay for the host's records).",
          "Host accounts and guides: until the host deletes the account in Settings, which deletes all properties, chats and requests immediately and cancels the subscription.",
          "Abuse-prevention counters: deleted within two days. Payment records: as long as Stripe and tax law require.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          `You can access, correct, export, restrict or delete your data and object to processing. Hosts can download all their data as a file ("Download my data") and delete their account in Settings. Guests can ask the host, or write to ${d.contactEmail} and we'll pass the request on. You can also complain to your data protection authority.`,
        ],
      },
      {
        heading: "On your device",
        paragraphs: [
          "Sign-in uses a necessary session cookie. Guides save the conversation id, chosen language and translations in your browser's local storage, and a service worker saves guide pages so they open offline. Clearing site data in your browser removes them. We don't use advertising or tracking cookies.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: ["We'll post changes here and update the date above, and tell hosts about significant changes before they apply."],
      },
    ],
  };
}

export function termsOfService(d = LEGAL_DETAILS): LegalPage {
  return {
    title: "Terms of service",
    intro: `These terms are an agreement between you and ${d.companyName}, ${d.companyAddress}, for the use of StayGuide. By creating an account you accept them.`,
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "StayGuide lets hosts publish digital guest guides with an AI concierge, receive guest questions and extra requests, and sell extras. The free demo stores data only in your browser.",
        ],
      },
      {
        heading: "Your account and content",
        paragraphs: [
          "You need a Google account with a verified email address. Keep access to it secure; you're responsible for activity in your account.",
          "You keep ownership of everything you upload. You give us the licence needed to host, process (including with AI), translate and show it to your guests. Only upload content you have the right to use, and don't put door codes or other secrets you wouldn't want every guest link to see in a published guide.",
          "Don't use StayGuide for anything illegal, to send spam, or to try to break or overload the service.",
        ],
      },
      {
        heading: "AI answers",
        paragraphs: [
          "The concierge answers only from your guide and passes other questions to you, but AI can still make mistakes. You're responsible for your guide's accuracy and for answering guests. StayGuide is not an emergency service: guests should contact local emergency services in an emergency.",
        ],
      },
      {
        heading: "Plans, billing and cancellation",
        paragraphs: [
          "Paid plans are billed per property, monthly or yearly in advance, through Stripe, at the prices shown on the pricing page plus any applicable taxes. Each plan includes a monthly AI allowance; when it's used up, guests get answers from the guide's keyword search until the next month.",
          "You can change or cancel your plan at any time in Plans & billing. A cancellation takes effect at the end of the paid period; we don't refund partial periods unless the law requires it. If a payment fails, we'll email you and may move the account to the Free plan if it isn't fixed.",
          "We may change prices with at least 30 days' notice; the change applies from your next billing period.",
        ],
      },
      {
        heading: "Extras and payouts",
        paragraphs: [
          "Extras are sold by the host to the guest; the host is responsible for providing them, for refunds to guests and for any taxes. Online payments for extras go through Stripe Connect to the host's account, and StayGuide keeps a 5% fee. Stripe's own terms apply to payouts.",
        ],
      },
      {
        heading: "Availability and liability",
        paragraphs: [
          "We work to keep StayGuide available and guides work offline once opened, but we don't guarantee uninterrupted service.",
          "To the extent the law allows, we're not liable for indirect or consequential losses, and our total liability for any claim is limited to the amounts you paid us in the 12 months before it. Nothing in these terms limits liability that can't be limited by law.",
        ],
      },
      {
        heading: "Ending the agreement",
        paragraphs: [
          "You can delete your account at any time in Settings. We may suspend or close accounts that break these terms, after notice where reasonable.",
        ],
      },
      {
        heading: "Law and contact",
        paragraphs: [
          `These terms are governed by ${d.governingLaw}. Mandatory consumer protection rules of your country still apply. Questions: ${d.contactEmail}.`,
        ],
      },
    ],
  };
}
