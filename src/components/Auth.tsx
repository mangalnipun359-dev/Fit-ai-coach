import React, { useState } from 'react';
import { Sparkles, Activity, Key, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both raw email and security password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authenication process encountered an issue.');
      }

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen" className="min-h-screen flex items-center justify-center bg-stone-950 px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative subtle gradient meshes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>

      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Brand identity */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-2xl mb-3 flex items-center justify-center">
            <Activity className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            Fit<span className="text-emerald-400">AI</span> Coach
          </h1>
          <p className="text-stone-400 text-sm mt-1.5 max-w-[280px]">
            Your custom personal health, workout, and meal optimizer
          </p>
        </div>

        {/* Auth Tab Picker */}
        <div className="grid grid-cols-2 bg-stone-950/80 p-1 rounded-xl mb-6 border border-stone-800/80">
          <button
            id="tab-login"
            type="button"
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              isLogin ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            id="tab-register"
            type="button"
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              !isLogin ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Displays status errors */}
        {error && (
          <div id="auth-error" className="mb-5 p-3.5 bg-red-950/50 border border-red-900/60 rounded-xl text-red-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5 pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 h-4 w-4" />
              <input
                id="input-email"
                type="email"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500/80 text-white text-sm rounded-xl py-2.5 pl-10 pr-4 outline-none transition-all duration-200"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5 pl-1">
              Secret Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 h-4 w-4" />
              <input
                id="input-password"
                type="password"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500/80 text-white text-sm rounded-xl py-2.5 pl-10 pr-4 outline-none transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-stone-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mt-2 transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" /> Sign In to Coach
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Sign Up & Start Onboarding
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-stone-800/80 pt-4 text-center">
          <p className="text-xs text-stone-500">
            {isLogin 
              ? "New to FitAI Coach? Choose 'Create Account' above."
              : "Already registering with us? Login using your credentials."}
          </p>
        </div>
      </div>
    </div>
  );
}
