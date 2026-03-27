"use client";

import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    if (pathname !== "/") {
        return null;
    }

    return (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6 mix-blend-plus-lighter pointer-events-none">
            <nav className="pointer-events-auto rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] px-6 py-3 flex items-center justify-between gap-12 max-w-2xl w-full">
                <a href="/" className="flex items-center gap-2 transition-transform hover:scale-105 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-violet-500 flex items-center justify-center p-[1px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center group-hover:bg-transparent transition-colors duration-300">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                            </svg>
                        </div>
                    </div>
                    <span className="text-lg font-bold font-heading text-white tracking-tight hidden sm:block">CodeComm</span>
                </a>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <a href="#features" className="text-white/60 hover:text-white transition-colors">Features</a>
                    <a href="#customers" className="text-white/60 hover:text-white transition-colors">Customers</a>
                    <a href="#pricing" className="text-white/60 hover:text-white transition-colors">Pricing</a>
                </div>

                <div className="flex items-center gap-4">
                    <a href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Log In</a>
                    <a href="/scan" className="relative group overflow-hidden rounded-full p-[1px]">
                        <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-spin-slow"></span>
                        <div className="relative bg-black px-5 py-2 rounded-full text-sm font-medium text-white transition-transform group-hover:scale-[0.98]">
                            Start Commenting
                        </div>
                    </a>
                </div>
            </nav>
        </div>
    );
}
