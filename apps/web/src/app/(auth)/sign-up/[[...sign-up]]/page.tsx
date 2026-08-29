'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
          accentBg: 'bg-rose-500/10',
          accentBorder: 'border-rose-500/30',
          accentText: 'text-rose-700',
          activeButton: 'bg-rose-700 text-white shadow-sm',
          colorPrimary: '#be123c',
          redirectUrl: '/admin',
        };
      case 'MENTOR':
        return {
          title: 'Create Mentor Account',
          subtitle: 'Guide learners, conduct triage interventions, and mentor 1-on-1 sessions',
          icon: UserCheck,
          accentBg: 'bg-emerald-500/10',
          accentBorder: 'border-emerald-500/30',
          accentText: 'text-emerald-700',
          activeButton: 'bg-emerald-700 text-white shadow-sm',
          colorPrimary: '#047857',
          redirectUrl: '/mentor',
        };
      default:
        return {
          title: 'Create Learner Account',
          subtitle: 'Personalized AI-guided curriculum, coding challenges, and career pathfinder',
          icon: Compass,
          accentBg: 'bg-aven-primary/10',
          accentBorder: 'border-aven-primary/30',
          accentText: 'text-aven-primary',
          activeButton: 'bg-aven-primary text-white shadow-sm',
          colorPrimary: '#3d348b',
          redirectUrl: '/diagnostic',
        };
    }
  };

  const currentRoleConfig = getRoleConfig(selectedRole);
  const HeaderIcon = currentRoleConfig.icon;

  return (
    <div className="min-h-screen w-full bg-aven-base flex flex-col items-center justify-center p-4 relative overflow-hidden text-aven-text">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-aven-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-aven-secondary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-1 mb-1">
          <Link
            href="/"
            className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${currentRoleConfig.accentBg} border ${currentRoleConfig.accentBorder} ${currentRoleConfig.accentText} mb-1 shadow-sm transition-all hover:scale-105`}
          >
            <HeaderIcon size={24} />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-aven-text tracking-tight uppercase">
            {currentRoleConfig.title}
          </h1>
          <p className="text-xs text-aven-text-subtle font-medium max-w-xs mx-auto">
            {currentRoleConfig.subtitle}
          </p>
        </div>

        {/* 3-Role Interactive Selector Pills */}
        <div className="w-full bg-aven-surface border border-aven-border rounded-2xl p-1.5 grid grid-cols-3 gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedRole('LEARNER')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedRole === 'LEARNER'
                ? 'bg-aven-primary text-white shadow-sm'
                : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-border'
            }`}
          >
            <Compass size={14} />
            <span>Learner</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('MENTOR')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedRole === 'MENTOR'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-border'
            }`}
          >
            <UserCheck size={14} />
            <span>Mentor</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('ADMIN')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedRole === 'ADMIN'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-border'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Admin</span>
          </button>
        </div>

        {/* Clerk Sign Up Component */}
        <div className="w-full flex justify-center">
          <SignUp
            key={selectedRole}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl={currentRoleConfig.redirectUrl}
            appearance={{
              variables: {
                colorPrimary: currentRoleConfig.colorPrimary,
                colorBackground: '#e8e6dc',
                borderRadius: '1rem',
              },
              elements: {
                rootBox: 'w-full flex justify-center',
                card: 'bg-aven-surface border border-aven-border shadow-xl backdrop-blur-xl rounded-3xl w-full text-aven-text p-6 sm:p-8',
                headerTitle: 'text-aven-text font-black uppercase tracking-tight text-lg',
                headerSubtitle: 'text-aven-text-subtle text-xs font-medium',
                socialButtonsBlockButton: 'bg-aven-base border border-aven-border text-aven-text hover:bg-aven-border font-bold text-xs rounded-xl transition-all shadow-sm',
                socialButtonsBlockButtonText: 'text-aven-text font-bold text-xs',
                dividerLine: 'bg-aven-border',
                dividerText: 'text-aven-text-muted text-[10px] uppercase font-black tracking-widest',
                formFieldLabel: 'text-[10px] font-black uppercase tracking-widest text-aven-text-subtle',
                formFieldInput: 'bg-aven-base border border-aven-border text-aven-text rounded-xl focus:border-aven-primary text-xs shadow-sm',
                formButtonPrimary: `${selectedRole === 'ADMIN' ? 'bg-rose-700 hover:bg-rose-600' : selectedRole === 'MENTOR' ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-aven-primary hover:bg-aven-primary/90'} text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md py-3 transition-all`,
                footerActionLink: 'text-aven-primary hover:text-aven-secondary font-bold text-xs underline',
                footerActionText: 'text-aven-text-subtle text-xs',
                footer: 'border-t border-aven-border bg-transparent',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
