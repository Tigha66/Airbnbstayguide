import {
  BedDouble,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Home,
  KeyRound,
  MessageSquare,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type IntegrationStatus = "Live" | "Setup guide" | "Onboarding" | "Planned";

export type Integration = {
  name: string;
  status: IntegrationStatus;
  summary: string;
  setup: string;
};

export type IntegrationCategory = {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  description: string;
  integrations: Integration[];
};

export const integrationCategories: IntegrationCategory[] = [
  {
    title: "Booking channels",
    eyebrow: "Share the guest guide anywhere guests already book",
    icon: BedDouble,
    description:
      "StayGuide works today as a single guide link, QR code and message template for the channels independent hosts use most.",
    integrations: [
      {
        name: "Airbnb",
        status: "Setup guide",
        summary: "Scheduled message, Arrival guide and House manual placement.",
        setup: "Paste the StayGuide link into scheduled messages and arrival details. No Airbnb account connection is required.",
      },
      {
        name: "Booking.com",
        status: "Setup guide",
        summary: "Pre-arrival message template and property information link.",
        setup: "Add the guide link to automated guest messages and the booking confirmation notes.",
      },
      {
        name: "Vrbo",
        status: "Setup guide",
        summary: "Saved reply, pre-arrival message and guest welcome note.",
        setup: "Use the guide link in Vrbo message templates so guests get the same guide as direct and Airbnb stays.",
      },
      {
        name: "Direct booking sites",
        status: "Live",
        summary: "Website link, post-booking email and confirmation page.",
        setup: "Add the guide URL to your confirmation email, booking portal or guest area.",
      },
    ],
  },
  {
    title: "PMS and channel managers",
    eyebrow: "Documented handoff paths for property managers",
    icon: Home,
    description:
      "For managers using a PMS, StayGuide documents where the guide link and QR assets belong today while native sync is prioritized by customer demand.",
    integrations: [
      {
        name: "Guesty",
        status: "Onboarding",
        summary: "Automated message template, custom field and guide-link handoff.",
        setup: "Our onboarding checklist maps each property guide link to Guesty automated messages and custom fields.",
      },
      {
        name: "Hostaway",
        status: "Onboarding",
        summary: "Channel message automation and property-level link placement.",
        setup: "Use StayGuide links in Hostaway guest automation until native reservation sync is available.",
      },
      {
        name: "Lodgify",
        status: "Onboarding",
        summary: "Direct booking email, guest portal and pre-arrival message support.",
        setup: "Add the guide link to Lodgify confirmation and pre-arrival templates.",
      },
      {
        name: "Hostfully PMS",
        status: "Onboarding",
        summary: "Guide-link handoff for managers already operating in Hostfully.",
        setup: "Use StayGuide for AI answers and extras while keeping Hostfully as the booking system of record.",
      },
      {
        name: "OwnerRez",
        status: "Onboarding",
        summary: "Email templates and trigger-based guest messaging.",
        setup: "Place the guide link in OwnerRez triggered emails and property instructions.",
      },
      {
        name: "Smoobu",
        status: "Onboarding",
        summary: "Guest communication templates and booking-channel message handoff.",
        setup: "Document the guide link per property and insert it into Smoobu guest communications.",
      },
    ],
  },
  {
    title: "Guest messaging",
    eyebrow: "Meet guests in the channels they actually read",
    icon: MessageSquare,
    description:
      "StayGuide keeps the guide itself channel-neutral, then gives hosts practical placements for guest communication tools.",
    integrations: [
      {
        name: "WhatsApp",
        status: "Setup guide",
        summary: "One-tap guide link for arrival day and in-stay support.",
        setup: "Send the guide URL in WhatsApp broadcasts or saved replies.",
      },
      {
        name: "SMS",
        status: "Setup guide",
        summary: "Short pre-arrival message with the guide URL.",
        setup: "Use the guide URL in SMS reminders from your current messaging provider.",
      },
      {
        name: "Email",
        status: "Live",
        summary: "Confirmation, pre-arrival and checkout follow-up templates.",
        setup: "Paste the guide link into the emails guests already receive.",
      },
      {
        name: "Host inbox",
        status: "Live",
        summary: "AI escalations and host replies inside StayGuide.",
        setup: "Guests ask in the guide; unanswered questions become host inbox threads.",
      },
    ],
  },
  {
    title: "Automation and data",
    eyebrow: "Exportable links now, deeper automation next",
    icon: Share2,
    description:
      "StayGuide already exposes durable guide links and payment webhooks internally. The next layer is documented partner automation for larger portfolios.",
    integrations: [
      {
        name: "QR cards",
        status: "Live",
        summary: "Printable QR codes for every property guide.",
        setup: "Print or save the QR card from the Share kit and place it in the property.",
      },
      {
        name: "iCal calendars",
        status: "Planned",
        summary: "Reservation-date awareness for timed upsells and reminders.",
        setup: "Planned for hosts who need check-in and checkout timing without a full PMS integration.",
      },
      {
        name: "Zapier",
        status: "Planned",
        summary: "No-code triggers for new properties, guide views and extra requests.",
        setup: "Planned after the public webhook contract is stabilized.",
      },
      {
        name: "Public webhooks",
        status: "Planned",
        summary: "Event delivery for extras, inbox escalations and guide activity.",
        setup: "Stripe webhooks run billing today; customer-facing webhooks are on the integration roadmap.",
      },
    ],
  },
  {
    title: "Payments and access",
    eyebrow: "Commerce and guest access that already work",
    icon: CreditCard,
    description:
      "StayGuide’s live payment stack supports subscriptions and guest extras while keeping the guest guide easy to open.",
    integrations: [
      {
        name: "Stripe Checkout",
        status: "Live",
        summary: "Self-serve plan checkout and Customer Portal billing.",
        setup: "Hosts subscribe by card and manage billing through Stripe.",
      },
      {
        name: "Stripe Connect",
        status: "Live",
        summary: "Guest extras paid to the host’s connected Stripe account.",
        setup: "Hosts connect Stripe before taking guest extras payments.",
      },
      {
        name: "Google sign-in",
        status: "Live",
        summary: "Host account access with Google OAuth.",
        setup: "Hosts can sign in with Google and manage their property guides.",
      },
      {
        name: "No guest login",
        status: "Live",
        summary: "Guests open guides by link or QR code.",
        setup: "No app install or guest account is needed.",
      },
    ],
  },
];

export const integrationStatusTone: Record<IntegrationStatus, string> = {
  Live: "live",
  "Setup guide": "guide",
  Onboarding: "onboarding",
  Planned: "planned",
};

export const integrationStats = [
  { label: "documented platforms and workflows", value: "24+" },
  { label: "major host channels covered", value: "4" },
  { label: "PMS setup paths", value: "6" },
];

export const integrationPlaybooks = [
  {
    title: "First property",
    icon: Sparkles,
    steps: ["Create the guide", "Copy the guest link", "Add it to Airbnb, Booking.com, Vrbo and your QR card"],
  },
  {
    title: "Small portfolio",
    icon: CalendarDays,
    steps: ["Map every property to a guide", "Add links to PMS message templates", "Review guide views and AI escalations weekly"],
  },
  {
    title: "Managed onboarding",
    icon: KeyRound,
    steps: ["Send us your current manual and message templates", "We build the guide and channel checklist", "Your team gets a property-by-property rollout sheet"],
  },
  {
    title: "Partner roadmap",
    icon: ExternalLink,
    steps: ["Track requested PMS tools", "Prioritize native sync from paying-customer demand", "Publish the API/webhook contract before claiming automation"],
  },
];

export const integrationDisclaimer =
  "Native account sync with Airbnb, Booking.com, Vrbo and PMS platforms is not claimed here unless marked Live. Most channel and PMS entries are documented setup paths that use StayGuide links, templates and onboarding.";
