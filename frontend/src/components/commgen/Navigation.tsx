import Link from 'next/link';
import { User } from 'lucide-react';

export default function Navigation() {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl rounded-full bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 flex items-center justify-between shadow-2xl">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="grid grid-cols-2 gap-[2px]">
          <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#a855f7] transition-colors duration-300"></div>
          <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#a855f7] transition-colors duration-300"></div>
          <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#a855f7] transition-colors duration-300"></div>
          <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#a855f7] transition-colors duration-300"></div>
        </div>
        <span className="font-heading font-black tracking-tight text-white text-lg">COMMGEN</span>
      </Link>

      {/* Center Links (Optional/Hidden on mobile) */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
        <Link href="#features" className="hover:text-white transition-colors">Features</Link>
        <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
        <Link href="/feedback" className="hover:text-white transition-colors">Feedback</Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Link href="/login" className="hidden md:flex text-sm font-semibold text-white/80 hover:text-white transition-colors">
          Sign In
        </Link>
        <Link href="/signup" className="hidden md:flex relative items-center justify-center p-[2px] rounded-full overflow-hidden">
           <span className="absolute inset-0 bg-gradient-to-r from-white to-gray-400"></span>
           <span className="relative bg-black/80 px-4 py-1.5 rounded-full text-sm font-semibold text-white backdrop-blur hover:bg-black/60 transition-colors">
              Get Started
           </span>
        </Link>
        
        <Link href="/dashboard" className="relative flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
          <User className="w-4 h-4 text-white/80" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#a855f7] rounded-full animate-pulse-slow shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
        </Link>
        
        {/* Mobile Menu Toggle */}
        <button className="md:hidden flex flex-col gap-1.5 p-2" aria-label="Menu">
          <div className="w-5 h-px bg-white"></div>
          <div className="w-5 h-px bg-white"></div>
        </button>
      </div>
    </nav>
  );
}
