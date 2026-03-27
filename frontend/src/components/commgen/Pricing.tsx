'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 md:py-32 relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black font-heading text-white mb-4 tracking-tight">Simple, transparent pricing.</h2>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-4 mb-16 relative">
        <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-white' : 'text-white/50'}`}>Monthly</span>
        <button 
          onClick={() => setIsYearly(!isYearly)}
          className="w-16 h-8 rounded-full border border-white/20 bg-black/50 backdrop-blur-xl relative flex items-center px-1 cursor-pointer"
        >
          <div className={`w-6 h-6 rounded-full bg-white transition-transform duration-300 ${isYearly ? 'translate-x-8' : 'translate-x-0'}`}></div>
        </button>
        <span className={`text-sm font-medium transition-colors flex items-center gap-2 ${isYearly ? 'text-white' : 'text-white/50'}`}>
          Yearly 
          <span className="text-xs bg-[#a855f7]/20 text-[#a855f7] px-2 py-0.5 rounded-full border border-[#a855f7]/30 animate-pulse">Save 20%</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative group rounded-[2.5rem] p-[1px] bg-gradient-to-b from-white/20 to-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-[#a855f7]/30 to-[#10b981]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem]"></div>
        <div className="relative bg-[#020617] rounded-[2.5rem] p-10 flex flex-col flex-1 border border-white/5 backdrop-blur-2xl text-center pb-12">
          <h3 className="text-2xl font-bold font-heading text-white mb-2">Pro Plan</h3>
          <p className="text-white/50 text-sm mb-8">For developers building the future.</p>
          
          <div className="flex items-baseline justify-center gap-1 mb-8">
            <span className="text-6xl font-black font-heading tracking-tighter text-white">${isYearly ? '159' : '19'}</span>
            <span className="text-white/50 font-medium">/{isYearly ? 'yr' : 'mo'}</span>
          </div>

          <button className="w-full py-4 rounded-xl bg-gradient-to-r from-white to-gray-300 text-black font-bold hover:scale-[1.02] transition-transform duration-300 mb-8 cursor-pointer">
            Get Started
          </button>

          <ul className="flex flex-col gap-4 text-sm text-white/70 w-full text-left">
            <li className="flex items-center gap-3"><Check className="w-4 h-4 text-[#10b981]" /> Unlimited Repositories</li>
            <li className="flex items-center gap-3"><Check className="w-4 h-4 text-[#10b981]" /> Auto PR Generation</li>
            <li className="flex items-center gap-3"><Check className="w-4 h-4 text-[#10b981]" /> Deep Context Analysis</li>
            <li className="flex items-center gap-3"><Check className="w-4 h-4 text-[#10b981]" /> IDE Extensions</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
