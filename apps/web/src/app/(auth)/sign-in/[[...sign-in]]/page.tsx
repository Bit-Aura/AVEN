'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
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
  KeyRound,
} from 'lucide-react';
import { loginUser } from '../../../../api/client';
import { isClerkConfigured } from '../../../../lib/clerkSafe';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDemoForm, setShowDemoForm] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-1 mb-2">
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

        {/* Clerk Sign In Component when configured */}
        {isClerkConfigured && !showDemoForm ? (
          <div className="w-full flex flex-col items-center">
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl="/learner"
              appearance={{
                variables: {
                  colorPrimary: '#6366f1',
                  colorBackground: '#18181b',
                  borderRadius: '1rem',
                },
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-[#18181b]/95 border border-[#27272a] shadow-2xl backdrop-blur-xl rounded-3xl w-full',
                  headerTitle: 'text-white font-black',
                  headerSubtitle: 'text-slate-400 text-xs',
                  socialButtonsBlockButton: 'bg-[#27272a] border border-[#3f3f46] text-white hover:bg-[#3f3f46]',
                  formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-glow-indigo py-2.5',
                  formFieldInput: 'bg-[#121214] border border-[#27272a] text-white rounded-2xl focus:border-indigo-500 text-xs',
                  footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-bold',
                  footer: 'border-t border-[#27272a]',
                },
              }}
            />

            {/* Switch to Standard Email/Password Form */}
            <div className="mt-4 pt-3 border-t border-border/40 w-full text-center">
              <button
                type="button"
                onClick={() => setShowDemoForm(true)}
                className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-1.5 mx-auto font-medium transition-colors cursor-pointer"
              >
                <KeyRound size={13} />
                <span>Want to use standard email login instead? Click here</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full bg-surface/90 border border-border rounded-3xl shadow-2xl backdrop-blur-xl p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">
                  Account Sign In
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Email & Password
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Enter your registered email address and password to continue.
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
            <form onSubmit={handleCustomLogin} className="space-y-4">
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

            {/* Toggle back to Clerk */}
            {isClerkConfigured && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoForm(false)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline transition-colors cursor-pointer"
                >
                  ← Back to Clerk Sign In
                </button>
              </div>
            )}

            {/* Sign Up Footer */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <Link href="/sign-up" className="text-brand-400 hover:text-brand-300 font-bold underline transition-colors">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

