'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  Compass,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { loginUser } from '../../../../api/client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await loginUser({ email: email.trim(), password });
      const role = (data.user?.role || 'LEARNER').toUpperCase();

      // Role-based redirection
      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'MENTOR') {
        router.push('/mentor');
      } else {
        router.push('/learner');
      }
    } catch (err: any) {
      console.error('Login error', err);
      setErrorMsg(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoPreset = (presetEmail: string, presetRole: string) => {
    setEmail(presetEmail);
    setPassword('Aven@123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface/90 border border-border rounded-3xl shadow-2xl backdrop-blur-xl p-8 space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mb-1 shadow-glow-indigo">
            <Compass size={24} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Sign In to AVEN
          </h1>
          <p className="text-xs text-slate-400">
            Ground-Truth AI Learning Path & Career Pathfinder
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-surface-secondary border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-secondary border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-indigo transition-all mt-2 cursor-pointer"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            <span>Sign In</span>
          </button>
        </form>

        {/* Demo Fast-Fill Section */}
        <div className="pt-4 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Sparkles size={12} className="text-brand-400" />
              <span>Demo Quick-Fill</span>
            </span>
            <span className="text-[10px] text-slate-500 lowercase">pass: Aven@123</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoPreset('admin@aven.com', 'ADMIN')}
              className="px-2.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
            >
              <ShieldCheck size={12} />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoPreset('mentor@pathfinder.dev', 'MENTOR')}
              className="px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
            >
              <UserCheck size={12} />
              <span>Mentor</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoPreset('demo@pathfinder.dev', 'LEARNER')}
              className="px-2.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
            >
              <Compass size={12} />
              <span>Learner</span>
            </button>
          </div>
        </div>

        {/* Sign Up Footer */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link href="/sign-up" className="text-brand-400 hover:text-brand-300 font-bold underline transition-colors">
              Create Learner Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
