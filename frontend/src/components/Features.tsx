"use client";

import React, { useEffect, useRef } from "react";

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  // Intersection Observer for staggered card reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("feature-visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    const cards = sectionRef.current?.querySelectorAll(".feature-card");
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="py-28 relative overflow-hidden" ref={sectionRef}>
      {/* Background glows */}
      <div className="absolute top-1/4 left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-[10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <style dangerouslySetInnerHTML={{ __html: `
        .feature-card {
          opacity: 0;
          transform: translateY(40px) scale(0.97);
          transition: opacity 0.7s cubic-bezier(0.25,1,0.5,1), transform 0.7s cubic-bezier(0.25,1,0.5,1);
        }
        .feature-visible { opacity: 1; transform: translateY(0) scale(1); }
        .feature-card:nth-child(2) { transition-delay: 0.1s; }
        .feature-card:nth-child(3) { transition-delay: 0.2s; }
        .feature-card:nth-child(4) { transition-delay: 0.3s; }
        .feature-card:nth-child(5) { transition-delay: 0.4s; }

        .glow-ring { animation: glow-pulse 2s ease-in-out infinite; }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1); }
          50% { box-shadow: 0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.2); }
        }

        .pipeline-line { 
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent);
          animation: pipeline-flow 2s linear infinite; 
        }
        @keyframes pipeline-flow {
          0% { opacity: 0.3; transform: scaleX(0.5); }
          50% { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0.3; transform: scaleX(0.5); }
        }

        .typing-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        .stat-pulse { animation: stat-glow 2.5s ease-in-out infinite; }
        @keyframes stat-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(59,130,246,0.3); }
          50% { text-shadow: 0 0 25px rgba(59,130,246,0.6), 0 0 50px rgba(59,130,246,0.2); }
        }
      `}} />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Features</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-5 tracking-tight">
            Everything you need for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
              perfect documentation
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            A developer-first experience designed to integrate seamlessly into your workflow.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[minmax(200px,auto)]">

          {/* ─── 1. LARGE: AI Comment Generation ─── */}
          <div className="feature-card md:col-span-2 md:row-span-2 group relative rounded-3xl p-8 overflow-hidden border-2 border-white bg-[#020617] backdrop-blur-md hover:border-indigo-500/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.1)]">
            {/* Background Visual */}
            <div className="absolute inset-0 z-0 transition-opacity duration-500">
              <img src="/images/ai.gif" alt="AI" className="w-full h-full object-cover" />
            </div>
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl z-1" />
            {/* Top-left accent glow */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/30 transition-colors z-1" />

            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-600/20 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] glow-ring">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">AI Comment Generation</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed max-w-md">
                Instantly generate meaningful JSDoc, Python docstrings, and inline comments that actually explain the &ldquo;why&rdquo; behind the code.
              </p>
              
              {/* Code Editor Mockup */}
              <div className="rounded-xl bg-[#0d1117] border border-white/[0.06] overflow-hidden mt-auto shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] group-hover:shadow-[0_25px_60px_-15px_rgba(99,102,241,0.15)] transition-shadow">
                <div className="bg-[#161b22] px-4 py-2.5 text-xs text-gray-500 border-b border-white/[0.04] font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    <span className="ml-2 text-gray-400">auth.ts</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    AI Generating...
                  </span>
                </div>
                <div className="p-5 font-mono text-sm leading-relaxed overflow-x-auto">
                  <div className="text-green-400/90 mb-3 pl-2 border-l-2 border-green-500/30">
                    <span className="opacity-60">{"/**"}</span><br/>
                    <span> * Validates JWT token and extracts user permissions.</span><br/>
                    <span> * Throws AuthError if expired or invalid.</span><br/>
                    <span> * </span><br/>
                    <span> * <span className="text-blue-300">@param</span> {"{"}<span className="text-yellow-300">string</span>{"}"} token - Raw JWT string</span><br/>
                    <span> * <span className="text-blue-300">@returns</span> {"{"}<span className="text-yellow-300">Promise&lt;UserPayload&gt;</span>{"}"}</span><br/>
                    <span className="opacity-60">{" */"}</span>
                  </div>
                  <div>
                    <span className="text-purple-400">export async function</span>{" "}
                    <span className="text-blue-300">verifyAuth</span>
                    <span className="text-gray-300">(token: </span>
                    <span className="text-yellow-300">string</span>
                    <span className="text-gray-300">)</span>
                    <span className="text-gray-300">{" {"}</span>
                  </div>
                  <div className="text-gray-600 pl-4">{"// implementation"}<span className="typing-cursor text-indigo-400">|</span></div>
                  <div className="text-gray-300">{"}"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. SMALL: Lightning Fast ─── */}
          <div className="feature-card group relative rounded-3xl p-8 overflow-hidden border border-white/[0.06] bg-[#020617] backdrop-blur-md hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.15)]">
            {/* Background Visual */}
            <div className="absolute inset-0 z-0 transition-opacity duration-500">
              <img src="/images/200ms.jpg" alt="Speed" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-black/40 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl z-1" />
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
              <div className="stat-pulse text-5xl font-black text-blue-300 tracking-tighter mb-2">{"<"}200ms</div>
              <h3 className="text-xl font-bold text-white mb-2">Lightning Fast</h3>
              <p className="text-sm text-gray-300">Real-time generation per file.</p>
            </div>
          </div>

          {/* ─── 3. SMALL: Secure by Design ─── */}
          <div className="feature-card group relative rounded-3xl p-8 overflow-hidden border border-white/[0.06] bg-[#020617] backdrop-blur-md hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)]">
            {/* Background Visual */}
            <div className="absolute inset-0 z-0 transition-opacity duration-500">
              <img src="/images/secure.gif" alt="Secure" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-black/40 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl z-1" />

            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
              <h3 className="text-xl font-bold text-white mb-2">Secure by Design</h3>
              <p className="text-sm text-gray-300 mb-4">We never store your source code.</p>
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[12px] font-bold text-emerald-300 uppercase tracking-wider">SOC2 Compliant</span>
              </div>
            </div>
          </div>

          {/* ─── 4. WIDE: GitHub CI ─── */}
          <div className="feature-card md:col-span-2 group relative rounded-3xl p-8 overflow-hidden border border-white/[0.06] bg-[#020617] backdrop-blur-md hover:border-purple-500/20 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.12)]">
            {/* Background Visual */}
            <div className="absolute inset-0 z-0 transition-opacity duration-500">
              <img src="/images/github.jpg" alt="GitHub" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-800/10 via-indigo-900/10 to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl z-1" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 h-full">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.08] shadow-inner">
                    <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.254-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Native GitHub CI</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">Automate comments on every Pull Request. COMMGEN reviews your diffs and suggests improvements in real-time.</p>
              </div>

              {/* Pipeline Visualization */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] group-hover:border-indigo-500/30 transition-colors">
                  <span className="text-xs font-bold text-gray-300 tracking-tight">Repo</span>
                </div>
                <div className="w-8 h-[2px] pipeline-line rounded-full" />
                <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] group-hover:border-purple-500/30 transition-colors">
                  <span className="text-xs font-bold text-gray-300 tracking-tight">Code</span>
                </div>
                <div className="w-8 h-[2px] pipeline-line rounded-full" style={{ animationDelay: "0.3s" }} />
                <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <span className="text-xs font-bold text-indigo-300 tracking-tight">AI</span>
                </div>
                <div className="w-8 h-[2px] pipeline-line rounded-full" style={{ animationDelay: "0.6s" }} />
                <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <span className="text-xs font-bold text-purple-300 tracking-tight">Comments</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 5. SMALL: Editor Integration ─── */}
          <div className="feature-card group relative rounded-3xl p-6 overflow-hidden border-2 border-white bg-black hover:border-indigo-500/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/5 via-pink-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl z-0" />
            
            <div className="relative z-10 flex flex-col h-full text-white">
              <h3 className="text-lg font-bold mb-1.5">Editor Integration</h3>
              <p className="text-sm text-gray-400 mb-4 font-medium leading-relaxed">Works where you work. VS Code, IntelliJ, and more.</p>
              
              {/* Mini VS Code Mockup */}
              <div className="mt-auto rounded-xl bg-[#1e1e1e] border border-white/[0.08] relative overflow-hidden h-24 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] group-hover:border-purple-500/30 transition-colors">
                <div className="absolute top-2.5 left-3 flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                </div>
                <div className="absolute top-2 right-3 text-[9px] font-mono text-gray-700">main.py</div>
                <div className="mt-7 px-3 space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <div className="h-[6px] w-10 bg-purple-500/30 rounded-full" />
                    <div className="h-[6px] w-16 bg-blue-400/20 rounded-full" />
                  </div>
                  <div className="flex gap-2 items-center pl-3">
                    <div className="h-[6px] w-20 bg-green-400/25 rounded-full" />
                  </div>
                  <div className="flex gap-2 items-center pl-3">
                    <div className="h-[6px] w-14 bg-yellow-400/15 rounded-full" />
                    <div className="h-[6px] w-8 bg-gray-500/20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
