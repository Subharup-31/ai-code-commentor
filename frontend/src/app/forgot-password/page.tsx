'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset link sent! Check your email.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-8 group">
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
              </div>
              <span className="font-heading font-black tracking-tight text-white text-xl">COMMGEN</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-white/50 text-sm">Enter your email and we'll send you a reset link.</p>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-sm font-medium animate-fade-in">
              {message}
            </div>
          )}

          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#3b82f6] to-[#a855f7] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/50">
            Remember your password?{' '}
            <Link href="/login" className="text-[#3b82f6] hover:text-[#60a5fa] font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
