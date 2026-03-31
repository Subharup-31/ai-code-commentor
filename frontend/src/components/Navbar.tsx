"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = true; // Hardcoded for UI demonstration

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6 pointer-events-none">
      <div
        className={`pointer-events-auto w-full max-w-3xl transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] border border-white/[0.08] bg-black/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          ${mobileOpen ? "rounded-2xl" : "rounded-full"}
        `}
      >
        {/* ─── Desktop / Main Row ─── */}
        <div className="flex items-center justify-between h-14 px-5">
          {/* Logo: 4-dot geometric plus shape */}
          <Link href="/" className="flex-shrink-0 group" aria-label="COMMGEN Home">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute w-[5px] h-[5px] rounded-full bg-gray-300 group-hover:bg-white transition-colors" style={{ top: "2px", left: "50%", transform: "translateX(-50%)" }} />
              <div className="absolute w-[5px] h-[5px] rounded-full bg-gray-300 group-hover:bg-white transition-colors" style={{ bottom: "2px", left: "50%", transform: "translateX(-50%)" }} />
              <div className="absolute w-[5px] h-[5px] rounded-full bg-gray-300 group-hover:bg-white transition-colors" style={{ left: "2px", top: "50%", transform: "translateY(-50%)" }} />
              <div className="absolute w-[5px] h-[5px] rounded-full bg-gray-300 group-hover:bg-white transition-colors" style={{ right: "2px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </Link>

          {/* Center Links - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="group relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors overflow-hidden"
              >
                {/* Default text */}
                <span className="block transition-transform duration-300 group-hover:-translate-y-full">
                  {link.label}
                </span>
                {/* Sliding duplicate */}
                <span className="absolute inset-0 flex items-center justify-center text-white transition-transform duration-300 translate-y-full group-hover:translate-y-0">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Right Buttons / Profile - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/signup"
                  className="px-5 py-1.5 rounded-full text-sm font-medium text-black bg-gradient-to-b from-white to-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                >
                  Sign up
                </Link>
                <Link
                  href="/profile"
                  className="group relative flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                  aria-label="Your Profile"
                >
                  <User className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
                  <span className="absolute top-0 right-0 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-5 py-1.5 rounded-full text-sm font-medium text-gray-400 border border-white/10 hover:border-white/30 hover:text-white bg-transparent transition-all duration-300"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-1.5 rounded-full text-sm font-medium text-black bg-gradient-to-b from-white to-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger - Mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-[5px] group"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-[1.5px] bg-gray-300 group-hover:bg-white rounded-full transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[3.25px]" : ""}`}
            />
            <span
              className={`block w-5 h-[1.5px] bg-gray-300 group-hover:bg-white rounded-full transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[3.25px]" : ""}`}
            />
          </button>
        </div>

        {/* ─── Mobile Dropdown ─── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${mobileOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="px-5 pb-5 pt-2 flex flex-col gap-1 border-t border-white/[0.06]">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-white/[0.06]">
              {isLoggedIn ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-5 py-2.5 rounded-full text-sm font-medium text-black bg-gradient-to-b from-white to-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all duration-300"
                  >
                    Sign up
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-purple-300 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-300"
                  >
                    <User className="w-4 h-4" />
                    Your Profile
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-5 py-2.5 rounded-full text-sm font-medium text-gray-400 border border-white/10 hover:border-white/30 hover:text-white transition-all duration-300"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-5 py-2.5 rounded-full text-sm font-medium text-black bg-gradient-to-b from-white to-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all duration-300"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
