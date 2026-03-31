"use client";

import React, { useState } from "react";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Free",
      monthlyPrice: "$0",
      annualPrice: "$0",
      periodText: "/month",
      description: "Perfect for exploring COMMGEN on personal projects.",
      features: ["50 generations per month", "Standard models", "Web UI access", "VS Code Extension"],
      button: "Get Started Free",
      highlighted: false,
    },
    {
      name: "Pro",
      monthlyPrice: "$19",
      annualPrice: "$15",
      periodText: "/month",
      annualSubtext: "Billed $180 yearly",
      description: "Everything a professional developer needs to ship faster.",
      features: ["Unlimited generations", "Premium AI models", "Native GitHub CI integration", "Priority speed (<200ms)", "Custom prompt tuning"],
      button: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Team",
      monthlyPrice: "$49",
      annualPrice: "$39",
      periodText: "/user/month",
      annualSubtext: "Billed $468 yearly per user",
      description: "Advanced controls and collaboration for engineering teams.",
      features: ["Everything in Pro", "Active Directory / SSO", "Shared team prompts", "Admin analytics dashboard", "Dedicated support channel"],
      button: "Contact Sales",
      highlighted: false,
    }
  ];

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-10 px-4">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white hover:text-purple-300 transition-colors">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
            Stop wasting hours on documentation. Start generating it instantly.
          </p>

          {/* Pricing Toggle Slider */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-16 h-8 rounded-full bg-white/10 border border-white/20 hover:border-purple-500/50 hover:bg-white/20 transition-all p-1 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Toggle annual billing"
            >
              <div 
                className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{ transform: isAnnual ? 'translateX(32px)' : 'translateX(0)' }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors flex items-center gap-2 ${isAnnual ? 'text-white' : 'text-gray-400'}`}>
              Yearly 
              <span className="text-[10px] leading-none uppercase font-bold text-emerald-400 bg-emerald-400/15 ring-1 ring-emerald-400/30 px-2 py-1 rounded-full animate-pulse-slow">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center mt-12">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative rounded-3xl transition-transform duration-300 ${
                plan.highlighted 
                ? "md:-mt-8 shadow-[0_0_40px_rgba(99,102,241,0.2)] hover:scale-[1.02]" 
                : "hover:scale-[1.02]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-indigo-500/50 to-purple-500/50 z-0 opacity-70"></div>
              )}
              
              <div className={`relative z-10 h-full rounded-[23px] flex flex-col p-8 transition-all ${
                plan.highlighted ? "bg-[#0a0f1e] border border-transparent shadow-[inset_0_0_20px_rgba(168,85,247,0.15)]" : "bg-white/[0.02] backdrop-blur-md border border-white/10"
              }`}>
                {plan.highlighted && (
                  <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400/20">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <h3 className="text-xl font-medium text-white mb-2">{plan.name}</h3>
                
                <div className="mb-4 min-h-[5rem]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white transition-all duration-300">
                      {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    {plan.periodText && 
                      <span className="text-gray-400 font-medium">
                        {plan.periodText}
                      </span>
                    }
                  </div>
                  {/* Subtle yearly billing subtitle */}
                  <div className="h-5 mt-1">
                    {isAnnual && plan.annualSubtext && (
                      <span className="text-xs text-purple-300/80 font-medium animate-fade-in">
                        {plan.annualSubtext}
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-8 border-b border-white/10 pb-6 leading-relaxed">
                  {plan.description}
                </p>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start text-sm text-gray-300 group">
                      <div className="mt-0.5 mr-3 w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all">
                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${
                  plan.highlighted
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:-translate-y-1"
                  : "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"
                }`}>
                  {plan.button}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
