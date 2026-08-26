'use client';

import React, { useState, useEffect } from 'react';
import { useUser as useClerkUser, UserButton as ClerkUserButton } from '@clerk/nextjs';
import { fetchCurrentUser, logoutUser } from '../api/client';

const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
export const isClerkConfigured = Boolean(
  key &&
  key.startsWith('pk_') &&
  key.length > 25 &&
  !key.includes('placeholder') &&
  !key.includes('dummy') &&
  !key.includes('ZGVtby')
);

export interface AuthenticatedUser {
  id: string | number;
  fullName: string;
  firstName: string;
  username: string;
  role: 'LEARNER' | 'MENTOR' | 'ADMIN';
  primaryEmailAddress: { emailAddress: string };
}

export function useSafeUser() {
  const [localUser, setLocalUser] = useState<AuthenticatedUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Read locally stored session user
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aven_auth_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const canonicalRole = (parsed.role || 'LEARNER').toUpperCase();
          setLocalUser({
            id: parsed.id || 'local_user',
            fullName: parsed.name || parsed.email.split('@')[0].toUpperCase(),
            firstName: (parsed.name || parsed.email).split(' ')[0],
            username: parsed.email.split('@')[0],
            role: canonicalRole,
            primaryEmailAddress: { emailAddress: parsed.email },
          });
        } catch (e) {
          console.error('Error parsing stored user', e);
        }
      } else {
        // Default demo learner
        setLocalUser({
          id: 'demo_user',
          fullName: 'Demo Learner',
          firstName: 'Demo',
          username: 'demo_learner',
          role: 'LEARNER',
          primaryEmailAddress: { emailAddress: 'demo@pathfinder.dev' },
        });
      }
      setIsLoaded(true);
    }
  }, []);

  return {
    user: localUser,
    isLoaded: isLoaded,
    isSignedIn: !!localUser,
  };
}

export function SafeUserButton({ appearance }: { appearance?: any }) {
  const { user } = useSafeUser();

  const handleSignOut = () => {
    logoutUser();
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  };

  const role = user?.role || 'LEARNER';
  const initials = (user?.fullName || 'DL')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const roleColor =
    role === 'ADMIN'
      ? 'from-rose-500 to-amber-600'
      : role === 'MENTOR'
      ? 'from-emerald-500 to-teal-700'
      : 'from-indigo-500 to-indigo-700';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSignOut}
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center font-bold text-white text-xs border border-white/20 select-none shadow-sm hover:opacity-90 transition-all`}
        title={`${user?.fullName} (${role}) — Click to Sign Out`}
      >
        {initials}
      </button>
    </div>
  );
}
