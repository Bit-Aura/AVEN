'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import {
  Lock,
  Mail,
  User,
  Compass,
  ArrowRight,
  Loader2,
  AlertCircle,
  GraduationCap,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { registerUser } from '../../../../api/client';
import { isClerkConfigured } from '../../../../lib/clerkSafe';

type RoleType = 'LEARNER' | 'MENTOR' | 'ADMIN';

export default function SignUpPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType>('LEARNER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Sync role to localStorage so Clerk sync endpoint receives the selected role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pending_signup_role', selectedRole);
    }
  }, [selectedRole]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
      });

      if (selectedRole === 'ADMIN') {
        router.push('/admin');
      } else if (selectedRole === 'MENTOR') {
        router.push('/mentor');
      } else {
        router.push('/learner');
      }
    } catch (err: any) {
      console.error('Registration error', err);
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleConfig = (role: RoleType) => {
    switch (role) {
      case 'ADMIN':
        return {
          title: 'Create Administrator Account',
          subtitle: 'Platform governance, mentor approvals, and CMS infrastructure',
          icon: ShieldCheck,
          color: 'from-rose-500 to-amber-600',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/30',
          bgColor: 'bg-rose-500/10',
          redirectUrl: '/admin',
        };
      case 'MENTOR':
        return {
          title: 'Create Mentor Account',
          subtitle: 'Guide learners, conduct triage interventions, and mentor 1-on-1 sessions',
          icon: UserCheck,
          color: 'from-emerald-500 to-teal-700',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          bgColor: 'bg-emerald-500/10',
          redirectUrl: '/mentor',
        };
      default:
        return {
          title: 'Create Learner Account',
          subtitle: 'Personalized AI-guided curriculum, coding challenges, and career pathfinder',
          icon: Compass,
          color: 'from-indigo-500 to-indigo-700',
          textColor: 'text-indigo-400',
          borderColor: 'border-indigo-500/30',
          bgColor: 'bg-indigo-500/10',
          redirectUrl: '/learner',
        };
    }
  };

  const currentRoleConfig = getRoleConfig(selectedRole);
  const HeaderIcon = currentRoleConfig.icon;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-1 mb-1">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${currentRoleConfig.bgColor} border ${currentRoleConfig.borderColor} ${currentRoleConfig.textColor} mb-1 shadow-glow-indigo transition-all`}>
            <HeaderIcon size={24} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {currentRoleConfig.title}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {currentRoleConfig.subtitle}
          </p>
        </div>

        {/* 3-Role Interactive Selector Pills */}
        <div className="w-full bg-surface-secondary/80 border border-border rounded-2xl p-1.5 grid grid-cols-3 gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedRole('LEARNER')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedRole === 'LEARNER'
                ? 'bg-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-surface-tertiary'
            }`}
          >
            <Compass size={14} />
            <span>Learner</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('MENTOR')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedRole === 'MENTOR'
                ? 'bg-emerald-600 text-white shadow-glow-emerald'
                : 'text-slate-400 hover:text-white hover:bg-surface-tertiary'
            }`}
          >
            <UserCheck size={14} />
            <span>Mentor</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('ADMIN')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedRole === 'ADMIN'
                ? 'bg-rose-600 text-white shadow-glow-rose'
                : 'text-slate-400 hover:text-white hover:bg-surface-tertiary'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Admin</span>
          </button>
        </div>

        {/* Clerk Sign Up Component when configured */}
        {isClerkConfigured && !showCustomForm ? (
          <div className="w-full flex flex-col items-center">
            <SignUp
              key={selectedRole}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl={currentRoleConfig.redirectUrl}
              appearance={{
                variables: {
                  colorPrimary: selectedRole === 'ADMIN' ? '#e11d48' : selectedRole === 'MENTOR' ? '#059669' : '#6366f1',
                  colorBackground: '#18181b',
                  colorInputBackground: '#121214',
                  colorInputText: '#ffffff',
                  colorText: '#e4e4e7',
                  colorTextSecondary: '#a1a1aa',
                  colorNeutral: '#27272a',
                  borderRadius: '1rem',
                },
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-[#18181b]/95 border border-[#27272a] shadow-2xl backdrop-blur-xl rounded-3xl w-full',
                  headerTitle: 'text-white font-black',
                  headerSubtitle: 'text-slate-400 text-xs',
                  socialButtonsBlockButton: 'bg-[#27272a] border border-[#3f3f46] text-white hover:bg-[#3f3f46]',
                  formButtonPrimary: `${selectedRole === 'ADMIN' ? 'bg-rose-600 hover:bg-rose-500' : selectedRole === 'MENTOR' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white font-bold rounded-2xl shadow-glow-indigo py-2.5`,
                  formFieldInput: 'bg-[#121214] border border-[#27272a] text-white rounded-2xl focus:border-indigo-500 text-xs',
                  footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-bold',
                  footer: 'border-t border-[#27272a]',
                },
              }}
            />

            {/* Switch to Custom Form */}
            <div className="mt-4 pt-3 border-t border-border/40 w-full text-center">
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-1.5 mx-auto font-medium transition-colors cursor-pointer"
              >
                <KeyRound size={13} />
                <span>Want standard email registration instead? Click here</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full bg-surface/90 border border-border rounded-3xl shadow-2xl backdrop-blur-xl p-8 space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full bg-surface-secondary border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

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
                    placeholder="alex@example.com"
                    className="w-full bg-surface-secondary border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Password (6+ characters)
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface-secondary border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-surface-secondary/60 border border-border text-[11px] text-slate-400 leading-relaxed flex items-center justify-between">
                <span>Account Role:</span>
                <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-[10px] ${currentRoleConfig.bgColor} ${currentRoleConfig.textColor} border ${currentRoleConfig.borderColor}`}>
                  {selectedRole}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl ${
                  selectedRole === 'ADMIN' ? 'bg-rose-600 hover:bg-rose-500' : selectedRole === 'MENTOR' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
                } disabled:opacity-50 text-white font-bold text-xs shadow-glow-indigo transition-all mt-2 cursor-pointer`}
              >
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                <span>Sign Up & Continue</span>
              </button>
            </form>

            {/* Toggle back to Clerk */}
            {isClerkConfigured && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline transition-colors cursor-pointer"
                >
                  ← Back to Clerk Sign Up
                </button>
              </div>
            )}

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <Link href="/sign-in" className="text-brand-400 hover:text-brand-300 font-bold underline transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


