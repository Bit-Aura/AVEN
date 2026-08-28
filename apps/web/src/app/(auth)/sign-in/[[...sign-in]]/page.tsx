'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { Compass } from 'lucide-react';

export default function SignInPage() {
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

        {/* Clerk Sign In Component */}
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
        </div>
      </div>
    </div>
  );
}

