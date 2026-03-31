import Navbar from "@/components/Navbar";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { TypographyHero } from "@/components/TypographyHero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">
        <div className="overflow-x-hidden w-full min-h-screen">
          <div className="block md:hidden">
            <TypographyHero />
          </div>
          <div className="hidden md:block">
            <CinematicHero />
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-[#050b1a] to-[#030712] pointer-events-none -z-20" />
          <Features />
          <HowItWorks />
          <Pricing />
        </div>
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
