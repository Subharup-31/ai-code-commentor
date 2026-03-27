'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
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

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-block mb-8 group">
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
                <div className="w-2 h-2 bg-white rounded-sm group-hover:bg-[#3b82f6] transition-colors duration-300"></div>
              </div>
              <span className="font-heading font-black tracking-tight text-white text-xl">COMMGEN</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
          <p className="text-white/50 text-sm">Please enter your new password below.</p>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                required
                placeholder="New password (min. 8 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error && e.target.value.length >= 8) setError(null);
                }}
                className={`w-full bg-white/5 border ${
                  error && password.length < 8 && password.length > 0 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-white/10 focus:border-[#3b82f6] focus:ring-[#3b82f6]'
                } rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:ring-1 transition-all`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || (password.length > 0 && password.length < 8)}
              className="w-full mt-2 bg-gradient-to-r from-[#3b82f6] to-[#a855f7] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
