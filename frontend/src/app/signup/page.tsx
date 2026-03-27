'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#10b981]/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-8 group">
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#10b981] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#10b981] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#10b981] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#10b981] transition-colors duration-300"></div>
              </div>
              <span className="font-heading font-black tracking-tight text-white text-xl">COMMGEN</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-white/50 text-sm">Join the Engine. Start documenting intelligently.</p>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {googleLoading ? (
               <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="mx-4 text-white/40 text-sm font-medium">or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
              />
            </div>
            <div>
              <input
                type="password"
                required
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error && e.target.value.length >= 8) setError(null);
                }}
                className={`w-full bg-white/5 border ${
                  error && password.length < 8 && password.length > 0 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-white/10 focus:border-[#10b981] focus:ring-[#10b981]'
                } rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:ring-1 transition-all`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading || (password.length > 0 && password.length < 8)}
              className="w-full mt-4 bg-gradient-to-r from-[#10b981] to-[#a855f7] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/50">
            Already have an account?{' '}
            <Link href="/login" className="text-[#a855f7] hover:text-[#c084fc] font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
