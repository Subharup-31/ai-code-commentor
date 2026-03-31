import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Connect Repo",
      desc: "Link your GitHub repository in one click with secure OAuth.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      )
    },
    {
      num: "02",
      title: "Fetch Code",
      desc: "COMMGEN parses your AST to understand the code structure.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      )
    },
    {
      num: "03",
      title: "AI Analysis",
      desc: "Our fine-tuned models analyze the logic and context.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
      )
    },
    {
      num: "04",
      title: "PR Created",
      desc: "A Pull Request is generated with perfect inline comments.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      )
    }
  ];

  return (
    <section className="py-24 bg-[#0a0f1c] relative border-y border-white/5">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="text-center mb-16 px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How it works</h2>
          <p className="text-gray-400">Adopt COMMGEN into your pipeline in 60 seconds.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-[50px] left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent -z-10" />

          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center relative max-w-xs group">
              <div className="w-24 h-24 rounded-full glass-card flex items-center justify-center mb-6 relative hover:scale-110 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all duration-300 z-10 bg-[#030712]">
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-lg border-2 border-[#030712]">
                  {step.num}
                </div>
                <div className="text-indigo-400 group-hover:text-purple-400 transition-colors">
                  {step.icon}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed px-4">{step.desc}</p>
              
              {index < steps.length - 1 && (
                <div className="md:hidden mt-8 text-indigo-500/40 transform rotate-90">
                  <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
