import { useRef } from "react";
import {
  LandingNav,
  HeroSection,
  StoryFlowSection,
  SyncHighlightSection,
  FeaturesGridSection,
  CTASection,
  FooterSection
} from "@/components/landing";

export default function LandingPage() {
  const scrollContainerRef = useRef(null);

  return (
    <div
      ref={scrollContainerRef}
      className="relative h-screen overflow-y-auto bg-slate-950 text-white overflow-x-hidden"
    >
      {/* Fixed Navigation */}
      <LandingNav />

      {/* Hero - First impression */}
      <HeroSection />

      {/* Story Flow - Scrollytelling through Year > Week > Day */}
      <StoryFlowSection scrollContainerRef={scrollContainerRef} />

      {/* Sync Highlight - Shows connection between all levels */}
      <SyncHighlightSection />

      {/* Additional Features Grid */}
      <FeaturesGridSection />

      {/* Call to Action */}
      <CTASection />

      {/* Footer */}
      <FooterSection />
    </div>
  );
}
