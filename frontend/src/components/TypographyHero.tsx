"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function TypographyHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parallax scroll effects
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section 
      ref={containerRef} 
      className="relative min-h-[95vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#020617] via-[#050b1f] to-[#020617] pt-20"
    >
      <style dangerouslySetInnerHTML={{__html: `
        .huge-brand-text {
          font-family: "Nunito", "Quicksand", system-ui, -apple-system, sans-serif;
          font-weight: 900;
          line-height: 0.85;
          letter-spacing: -0.04em;
          /* Outline stroke */
          -webkit-text-stroke: min(6px, 1.5vw) #020617;
          paint-order: stroke fill;
          /* Base drop shadow for depth */
          filter: drop-shadow(0px 20px 30px rgba(0,0,0,0.8)) drop-shadow(0px 0px 40px rgba(16, 185, 129, 0.2));
          position: relative;
          display: inline-block;
        }

        .gradient-green {
          background-image: linear-gradient(180deg, #6ee7b7 0%, #10b981 40%, #047857 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .gradient-blue {
          background-image: linear-gradient(180deg, #93c5fd 0%, #3b82f6 40%, #1d4ed8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0px 20px 30px rgba(0,0,0,0.8)) drop-shadow(0px 0px 40px rgba(59, 130, 246, 0.2));
        }

        /* Inner light reflection overlay using a pseudo-element */
        .huge-brand-text::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 30%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          pointer-events: none;
          -webkit-text-stroke: 0px;
        }

        .shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer-slide 4s infinite linear;
          position: absolute;
          inset: 0;
          z-index: 20;
          -webkit-text-stroke: 0px;
          pointer-events: none;
        }

        @keyframes shimmer-slide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}} />

      {/* ── Background Radial Glows ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] rounded-full bg-emerald-500/10 blur-[100px] mix-blend-screen absolute -translate-y-20" 
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute w-[90vw] h-[90vw] max-w-[700px] max-h-[700px] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen translate-y-32" 
        />
        {/* Tech Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_10%,transparent_100%)]" />
      </div>

      {/* ── Main Typography Container ── */}
      <motion.div 
        style={{ scale, y, opacity }}
        className="relative z-10 w-full flex flex-col items-center justify-center"
      >
        <motion.div
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex flex-col items-center justify-center select-none"
        >
          {/* Top Line: #COMM */}
          <div className="relative">
            <h1 
              data-text="#COMM"
              className="huge-brand-text gradient-green text-[22vw] sm:text-[18vw] md:text-[15vw] lg:text-[13rem]"
            >
              #COMM
            </h1>
            <div className="shimmer text-[22vw] sm:text-[18vw] md:text-[15vw] lg:text-[13rem] tracking-[-0.04em] font-black font-['Nunito',sans-serif]">#COMM</div>
          </div>

          {/* Bottom Line: GEN */}
          <div className="relative -mt-[4vw] sm:-mt-[3vw] lg:-mt-12 ml-[10vw] sm:ml-[8vw] lg:ml-24">
            {/* Soft backdrop shadow behind GEN */}
            <div className="absolute inset-0 bg-black/40 blur-xl rounded-full scale-75 translate-y-5 -z-10" />
            
            <h1 
              data-text="GEN"
              className="huge-brand-text gradient-blue text-[25vw] sm:text-[20vw] md:text-[17vw] lg:text-[15rem]"
            >
              GEN
            </h1>
            <div className="shimmer text-[25vw] sm:text-[20vw] md:text-[17vw] lg:text-[15rem] tracking-[-0.04em] font-black font-['Nunito',sans-serif]" style={{ animationDelay: "1s" }}>GEN</div>
          </div>
        </motion.div>

        {/* Subtitle / CTA under the giant text */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 sm:mt-20 flex flex-col items-center relative z-20 px-4"
        >
          <p className="text-gray-400 text-lg sm:text-xl md:text-2xl font-medium max-w-xl text-center shadow-black drop-shadow-lg">
            The next-generation AI developer tool.
            <br className="hidden sm:block" /> Stop writing docs, start shipping.
          </p>
          <div className="mt-8 flex gap-4">
            <button className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-sm sm:text-base hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Get Started
            </button>
            <button className="px-8 py-3.5 rounded-full bg-white/10 text-white font-bold text-sm sm:text-base border border-white/20 hover:bg-white/20 hover:scale-105 transition-all backdrop-blur-md">
              View Documentation
            </button>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
