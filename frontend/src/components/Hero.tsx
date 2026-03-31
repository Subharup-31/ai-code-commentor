import React from "react"; // Not needed in next15 usually but added safely
export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-30 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
        <div className="absolute top-[30%] right-[20%] w-72 h-72 bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[20%] left-[40%] w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: "4s" }} />
      </div>

      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center mt-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 animate-fade-in text-sm text-indigo-200">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          COMMGEN 2.0 is now live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          AI-Powered Code <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500">
            Comment Generation
          </span>
        </h1>
        
        <p className="mt-4 text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          Automatically generate meaningful, context-aware comments from your code and GitHub repositories using AI. Stop writing boilerplate docs and focus on shipping.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-100 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            Get Started
          </button>
          <button className="w-full sm:w-auto px-8 py-4 rounded-full glass-card text-white font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(129,140,248,0.2)]">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.254-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Connect GitHub
          </button>
        </div>
      </div>

      {/* Floating Glass Cards */}
      <div className="absolute bottom-10 left-10 hidden lg:block animate-blob" style={{ animationDelay: "1s" }}>
        <div className="glass-card p-4 rounded-xl border-l-4 border-l-indigo-500 transform rotate-[-5deg] hover:rotate-0 transition-transform">
          <div className="text-xs text-indigo-300 mb-1">Generated Comment</div>
          <div className="text-sm font-mono text-gray-200">{"// Handles auth token rotation"}</div>
        </div>
      </div>
      
      <div className="absolute top-40 right-10 hidden lg:block animate-blob" style={{ animationDelay: "3s" }}>
        <div className="glass-card p-4 rounded-xl border-l-4 border-l-purple-500 transform rotate-[5deg] hover:rotate-0 transition-transform">
          <div className="text-xs text-purple-300 mb-1">Code Analysis</div>
          <div className="text-sm font-mono text-gray-200">async function login() {"{ ... }"}</div>
        </div>
      </div>
    </section>
  );
}
