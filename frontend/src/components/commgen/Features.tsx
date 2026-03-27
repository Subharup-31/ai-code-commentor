import { Code2, Zap, ShieldCheck } from 'lucide-react';

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative z-10 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16 md:mb-24">
        <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tight text-white mb-6">
          Intelligence that scales.
        </h2>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto">
          Built for teams that move fast. Automate logic documentation without slowing down.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
        {/* Card 1: Speed (Stats Card) */}
        <div className="md:col-span-5 relative rounded-[2rem] border border-white/10 bg-[#09090b]/50 overflow-hidden group flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm transition-all hover:border-white/20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <h3 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-[#10b981] animate-pulse-slow mb-4">
            &lt;200ms
          </h3>
          <p className="text-2xl font-bold text-white/80 tracking-tight animate-pulse-slow" style={{ animationDelay: '0.5s' }}>
            Secure by Design
          </p>
        </div>

        {/* Card 2: AI Context */}
        <div className="md:col-span-7 relative rounded-[2rem] border border-white/10 bg-[#09090b]/50 overflow-hidden group p-8 backdrop-blur-sm transition-all hover:border-white/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#a855f7]/10 blur-[80px] rounded-full group-hover:bg-[#a855f7]/20 transition-all duration-700"></div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
              <Zap className="w-6 h-6 text-[#facc15]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 font-heading">Deep Context AI</h3>
              <p className="text-white/60 text-lg leading-relaxed">
                Our model analyzes cross-file dependencies and types to write robust documentation that actually makes sense.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Special Editor Integration Card */}
        <div className="md:col-span-12 relative rounded-[2rem] border-2 border-white bg-[#000000] overflow-hidden group p-8 flex flex-col md:flex-row items-center gap-8 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] transition-shadow duration-500">
          <div className="flex-1 z-10">
            <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center mb-6">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-black font-heading text-white mb-4">Native Editor Integration</h3>
            <p className="text-white/60 text-lg leading-relaxed">
              Works where you work. VS Code, Cursor, and JetBrains. Hover over any undocumented function, and COMMGEN completes it instantly.
            </p>
          </div>
          <div className="flex-1 w-full bg-[#0a0a0a] border border-white/20 rounded-xl p-6 font-mono text-sm text-white/70 overflow-hidden relative shadow-2xl z-10 max-h-48 flex flex-col">
            <div className="absolute top-0 right-0 bg-white/10 px-3 py-1 text-xs font-sans rounded-bl-lg">VS Code</div>
            <div className="text-[#a855f7] mb-2">/**</div>
            <div className="text-[#a855f7] mb-2 animate-pulse"> * Analyzing function dependencies...</div>
            <div className="text-[#a855f7] mb-2"> */</div>
            <div><span className="text-[#3b82f6]">export const</span> <span className="text-[#facc15]">processPayment</span> = {'async (data: PaymentIntent) => {'}</div>
            <div className="pl-4 mt-2 opacity-30">{'// implementation details'}</div>
            <div className="opacity-30">{'}'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
