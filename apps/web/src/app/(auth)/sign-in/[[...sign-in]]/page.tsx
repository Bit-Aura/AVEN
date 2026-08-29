'use client';

import React from 'react';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { Compass } from 'lucide-react';

/**
 * Enterprise-grade implementation of SignInPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen w-full bg-aven-base flex flex-col items-center justify-center p-4 relative overflow-hidden text-aven-text">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-aven-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-aven-secondary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-1 mb-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-aven-surface border border-aven-border text-aven-primary mb-1 shadow-sm hover:scale-105 transition-transform"
          >
            <Compass size={24} />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-aven-text tracking-tight uppercase">
            Sign In to AVEN
          </h1>
          <p className="text-xs text-aven-text-subtle font-medium">
            Ground-Truth AI Learning Path &amp; Career Pathfinder
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="w-full flex justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/learner"
            appearance={{
              variables: {
                colorPrimary: '#3d348b',
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
                formButtonPrimary: 'bg-aven-primary hover:bg-aven-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md py-3 transition-all',
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
