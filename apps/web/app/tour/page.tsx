import { GuidedTour } from "@/components/guided-tour";
import { onboardingText } from "@/lib/onboarding-i18n";
export const metadata = { title: onboardingText.en.tour, description: onboardingText.en.intro };
export default function Page() { return <GuidedTour locale="en" />; }
