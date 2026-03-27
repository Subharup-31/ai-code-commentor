import Navigation from '@/components/commgen/Navigation';
import Hero from '@/components/commgen/Hero';
import Features from '@/components/commgen/Features';
import Pricing from '@/components/commgen/Pricing';
import Auth3D from '@/components/commgen/Auth3D';

export default function LandingPage() {
  return (
    <div className="bg-[#020617] min-h-screen text-white overflow-hidden selection:bg-[#a855f7]/30">
      <Navigation />
      
      <main className="flex flex-col items-center w-full">
        <Hero />
        <Features />
        <Pricing />
        
        <div className="w-full py-24 relative z-10 flex flex-col items-center">
           <div className="text-center mb-12">
             <h2 className="text-4xl font-black font-heading text-white">Join the Engine</h2>
             <p className="text-white/50 mt-4 text-lg">Start documenting intelligently today.</p>
           </div>
           <Auth3D />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-[#020617] z-10 relative mt-12 w-full">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
             <div className="grid grid-cols-2 gap-[2px]">
               <div className="w-2 h-2 bg-[#a855f7] rounded-sm"></div>
               <div className="w-2 h-2 bg-[#a855f7] rounded-sm"></div>
               <div className="w-2 h-2 bg-[#a855f7] rounded-sm"></div>
               <div className="w-2 h-2 bg-[#a855f7] rounded-sm"></div>
             </div>
             <span className="font-bold text-white font-heading tracking-tight">COMMGEN</span>
          </div>
          <p className="text-white/40 mb-4 md:mb-0 md:absolute md:left-1/2 md:-translate-x-1/2">
            © 2026 COMMGEN. All rights reserved.
          </p>
          <div className="flex items-center gap-8 text-white/50">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
