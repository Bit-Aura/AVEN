'use client';

import React, { useState, useEffect } from 'react';
import { SignUp } from '@clerk/nextjs';
import {
  Compass,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

type RoleType = 'LEARNER' | 'MENTOR' | 'ADMIN';

export default function SignUpPage() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('LEARNER');

  // Sync role to localStorage so Clerk sync endpoint receives the selected role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pending_signup_role', selectedRole);
    }
  }, [selectedRole]);

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

        {/* Clerk Sign Up Component */}
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
        </div>
      </div>
    </div>
  );
}


