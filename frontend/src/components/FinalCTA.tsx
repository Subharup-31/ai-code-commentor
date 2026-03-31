"use client";

import React, { useState } from "react";

export default function FinalCTA() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <>
      <section className="py-32 relative overflow-hidden flex items-center justify-center">
        {/* Darker background and glowing effects */}
        <div className="absolute inset-0 bg-[#02050f] -z-20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_30%,transparent_100%)] pointer-events-none -z-10" />
        
        {/* Floating blurred shapes */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-blob" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-blob" style={{ animationDelay: "2s" }} />

        <div className="container mx-auto px-6 relative z-10 max-w-4xl text-center">
          {/* Light glass panel behind text */}
          <div className="glass-card p-12 md:p-16 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
            
            <div className="relative z-10 animate-slide-up">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                Start Generating Smart Code Comments Today
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                Try COMMGEN instantly and experience the future of AI-powered code documentation. Free for open source developers.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setShowVideo(true)}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:scale-105 transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.7)] text-lg"
                >
                  Start Demo
                </button>
                <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 border border-white/10 text-white font-semibold hover:bg-white/20 transition-all text-lg backdrop-blur-md">
                  Get Started
                </button>
              </div>
              
              <p className="mt-6 text-sm text-gray-500">
                No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-white/90">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setShowVideo(false)}
            aria-label="Close modal background"
          />
          <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden glass-card shadow-[0_0_40px_rgba(0,0,0,0.7)] animate-slide-up">
            {/* Close button */}
            <button 
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors border border-white/10"
              aria-label="Close demo video"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Aspect ratio container for video */}
            <div className="relative w-full pb-[56.25%] bg-black">
              {/* Using a generic demo video placeholder */}
              <iframe 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                title="COMMGEN Demo Video"
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
