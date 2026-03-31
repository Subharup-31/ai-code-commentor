"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { DitheringShader } from "@/components/ui/dithering-shader";
import { TextScramble } from "@/components/ui/text-scramble";

export default function StackedAuthCard({ initialCard = 'login' }: { initialCard?: 'login' | 'signup' }) {
  const router = useRouter();
  
  // UI State
  const [activeCard, setActiveCard] = useState<'login' | 'signup'>(initialCard);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // Auth State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveCard(initialCard);
  }, [initialCard]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username: username,
        }
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  // We rely on inline styles for 3d transform to get exact control.
  // Tailwind handles the rest like colors, blur, gradients.

  /**
   * Card 1: LOGIN
   */
  const loginIsActive = activeCard === 'login';
  const loginTransform = loginIsActive
    ? "translate3d(0, 0, 0px) rotateY(0deg) scale(1)"
    : "translate3d(-25%, 0, -200px) rotateY(12deg) scale(0.9)";
  const loginZIndex = loginIsActive ? 50 : 20;
  const loginOpacity = loginIsActive ? 1 : 0.4;
  const loginBlur = loginIsActive ? 'blur(0px)' : 'blur(4px)';

  /**
   * Card 2: SIGNUP
   */
  const signupIsActive = activeCard === 'signup';
  const signupTransform = signupIsActive
    ? "translate3d(0, 0, 0px) rotateY(0deg) scale(1)"
    : "translate3d(25%, 0, -200px) rotateY(-12deg) scale(0.9)";
  const signupZIndex = signupIsActive ? 50 : 20;
  const signupOpacity = signupIsActive ? 1 : 0.4;
  const signupBlur = signupIsActive ? 'blur(0px)' : 'blur(4px)';

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#02050f] overflow-hidden selection:bg-purple-500/30 font-sans">
      
      {/* 1. BACKGROUND: Dithering Shader */}
      <div className="absolute inset-0 z-0">
        <DitheringShader
          shape="ripple"
          type="2x2"
          colorBack="#001a0f"
          colorFront="#0a6e3a"
          pxSize={2}
          speed={1.2}
          width={1920}
          height={1080}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* 2. AUTHENTICATION CARDS WRAPPER */}
      <div 
        className="relative w-[90%] max-w-[480px] h-[750px] flex items-center justify-center z-10"
        style={{ perspective: "1500px", transformStyle: "preserve-3d" }}
      >
        {/* navigation arrows to hint at the other card */}
        <div className="absolute inset-y-0 -left-16 md:-left-24 flex items-center z-[60]">
          {!loginIsActive && (
            <button 
              onClick={() => setActiveCard('login')}
              className="p-4 rounded-full glass-card border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:scale-110 transition-all duration-300 animate-pulse-slow group"
              aria-label="Switch to Login"
            >
              <ArrowRight className="w-6 h-6 rotate-180 group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        <div className="absolute inset-y-0 -right-16 md:-right-24 flex items-center z-[60]">
          {!signupIsActive && (
            <button 
              onClick={() => setActiveCard('signup')}
              className="p-4 rounded-full glass-card border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:scale-110 transition-all duration-300 animate-pulse-slow group"
              aria-label="Switch to Signup"
            >
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="absolute top-4 w-full z-[100] p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium animate-fade-in text-center shadow-xl backdrop-blur-md">
            {error}
          </div>
        )}

        {/* =========================================
            CARD A: LOGIN CARD
           ========================================= */}
        <div 
          onClick={() => !loginIsActive && setActiveCard('login')}
          className={`absolute inset-0 top-[60px] h-[630px] w-full rounded-3xl border border-white/20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col items-center justify-center
            ${loginIsActive ? 'cursor-default shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_40px_rgba(168,85,247,0.2)]' : 'cursor-pointer hover:opacity-100 hover:border-white/40'}
          `}
          style={{
            zIndex: loginZIndex,
            transform: loginTransform,
            opacity: loginOpacity,
            filter: loginBlur,
            background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {loginIsActive && <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 rounded-3xl pointer-events-none" />}

          <div className="relative w-full h-full p-8 md:p-10 flex flex-col transition-opacity duration-300">
            {loginIsActive ? (
              <div className="flex flex-col h-full w-full animate-fade-in delay-200">
                <div className="mb-8 text-center pt-2">
                  <TextScramble text="COMMGEN" className="mb-2" />
                  <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-sm text-gray-400">Please enter your account details</p>
                </div>

                <form className="space-y-4 flex-1" onSubmit={handleLogin}>
                  <div className="group/input relative grow-animation">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within/input:text-purple-400 transition-colors" />
                    </div>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email" 
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500/80 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300 shadow-inner"
                    />
                  </div>

                  <div className="group/input relative grow-animation">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within/input:text-blue-400 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password" 
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300 shadow-inner"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-white transition-colors">Forgot password?</Link>
                  </div>

                  <div className="pt-4">
                    <button 
                      disabled={loading}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3.5 flex items-center justify-center font-bold text-lg text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_35px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : 'Sign In'}
                    </button>
                  </div>
                </form>

                <div className="mt-8 pb-2">
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  <User className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Welcome Back</h3>
                <p className="text-sm text-gray-300 mb-8 max-w-[200px]">Sign in to access your developer dashboard.</p>
                <div className="px-6 py-2 rounded-full border border-blue-400/50 bg-blue-500/10 text-blue-300 font-semibold group-hover:bg-blue-500/20 transition-colors shadow-inner">
                  Sign In
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================
            CARD B: SIGN UP CARD
           ========================================= */}
        <div 
          onClick={() => !signupIsActive && setActiveCard('signup')}
          className={`absolute inset-0 top-[60px] h-[630px] w-full rounded-3xl border border-white/20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col items-center justify-center
            ${signupIsActive ? 'cursor-default shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_40px_rgba(236,72,153,0.2)]' : 'cursor-pointer hover:opacity-100 hover:border-white/40'}
          `}
          style={{
            zIndex: signupZIndex,
            transform: signupTransform,
            opacity: signupOpacity,
            filter: signupBlur,
            background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {signupIsActive && <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-transparent to-purple-500/10 rounded-3xl pointer-events-none" />}

          <div className="relative w-full h-full p-8 md:p-10 flex flex-col transition-opacity duration-300">
            {signupIsActive ? (
              <div className="flex flex-col h-full w-full animate-fade-in delay-200">
                <div className="mb-6 text-center pt-2">
                  <TextScramble text="COMMGEN" className="mb-2" />
                  <h2 className="text-3xl font-bold text-white mb-1">Create Your Account</h2>
                  <p className="text-sm text-gray-400">Start generating AI-powered code comments</p>
                </div>

                <form className="space-y-4 flex-1" onSubmit={handleSignup}>
                  <div className="group/input relative grow-animation">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-500 group-focus-within/input:text-pink-400 transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username (optional)" 
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500/80 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 focus:bg-white/10 transition-all duration-300 shadow-inner"
                    />
                  </div>

                  <div className="group/input relative grow-animation">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within/input:text-purple-400 transition-colors" />
                    </div>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email" 
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500/80 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300 shadow-inner"
                    />
                  </div>

                  <div className="group/input relative grow-animation">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within/input:text-pink-400 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min. 8 characters)" 
                      className={`w-full pl-11 pr-4 py-3 bg-white/5 border ${password.length > 0 && password.length < 8 ? "border-red-500 focus:ring-red-500" : "border-white/10 focus:ring-pink-500/50 focus:border-pink-500/50"} rounded-xl text-white placeholder:text-gray-500/80 focus:outline-none focus:ring-2 focus:bg-white/10 transition-all duration-300 shadow-inner`}
                    />
                  </div>
                  
                  <div className="group/input relative grow-animation">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within/input:text-pink-400 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password" 
                      className={`w-full pl-11 pr-4 py-3 bg-white/5 border ${confirmPassword.length > 0 && confirmPassword !== password ? "border-red-500 focus:ring-red-500" : "border-white/10 focus:ring-pink-500/50 focus:border-pink-500/50"} rounded-xl text-white placeholder:text-gray-500/80 focus:outline-none focus:ring-2 focus:bg-white/10 transition-all duration-300 shadow-inner`}
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      disabled={loading || (password.length > 0 && password.length < 8) || (confirmPassword.length > 0 && confirmPassword !== password)}
                      className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-[1px] group/btn shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_35px_rgba(236,72,153,0.5)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
                    >
                      <div className="relative w-full h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl px-4 py-3 flex items-center justify-center gap-2 group-hover/btn:from-purple-500 group-hover/btn:to-pink-500 transition-colors">
                        {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <span className="text-white font-bold text-lg tracking-wide">Create Account</span>}
                      </div>
                    </button>
                  </div>

                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                  Already have an account?{" "}
                  <button onClick={(e) => { e.preventDefault(); setActiveCard('login'); }} className="font-bold text-pink-400 hover:text-pink-300 hover:underline underline-offset-4 transition-all">
                    Sign In
                  </button>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                  <ArrowRight className="w-8 h-8 text-pink-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Create Your Account</h3>
                <p className="text-sm text-gray-300 mb-8 max-w-[200px]">Start generating AI-powered code comments instantly.</p>
                <div className="px-6 py-2 rounded-full border border-pink-400/50 bg-pink-500/10 text-pink-300 font-semibold group-hover:bg-pink-500/20 transition-colors shadow-inner">
                  Register
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
