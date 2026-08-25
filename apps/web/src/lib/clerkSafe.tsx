'use client';

import React from 'react';
import { useUser as useClerkUser, UserButton as ClerkUserButton } from '@clerk/nextjs';

const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
export const isClerkConfigured = Boolean(
  key &&
  key.startsWith('pk_') &&
  key.length > 25 &&
  !key.includes('placeholder') &&
  !key.includes('dummy') &&
  !key.includes('ZGVtby')
);

export function useSafeUser() {
  if (!isClerkConfigured) {
    return {
      user: {
        id: 'demo_user',
        fullName: 'Demo Learner',
        firstName: 'Demo',
        username: 'demo_learner',
        primaryEmailAddress: { emailAddress: 'demo@pathfinder.dev' }
      },
      isLoaded: true,
      isSignedIn: true
    };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkUser();
}

export function SafeUserButton({ appearance }: { appearance?: any }) {
  if (!isClerkConfigured) {
    return (
      <div 
        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white text-xs border border-white/20 select-none shadow-sm cursor-default" 
        title="Demo Learner (Local Mode)"
      >
        DL
      </div>
    );
  }
  return <ClerkUserButton appearance={appearance} />;
}
