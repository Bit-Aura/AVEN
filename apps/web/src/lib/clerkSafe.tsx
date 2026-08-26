'use client';

import React, { useState, useEffect } from 'react';
import { useUser as useClerkUser, useClerk, UserButton as ClerkUserButton } from '@clerk/nextjs';
import { logoutUser } from '../api/client';
import { usePathStore } from '../store/usePathStore';

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
  clerk_id?: string;
  fullName: string;
  firstName: string;
  username: string;
  role: 'LEARNER' | 'MENTOR' | 'ADMIN';
  primaryEmailAddress: { emailAddress: string };
  imageUrl?: string;
}

export function useSafeUser() {
  const storeUser = usePathStore((state) => state.currentUser);
  const [localUser, setLocalUser] = useState<AuthenticatedUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Safely hook into Clerk when configured
  let clerkUserObj: any = null;
  let clerkLoaded = true;

  if (isClerkConfigured) {
    try {
      const clerkData = useClerkUser();
      clerkUserObj = clerkData?.user;
      clerkLoaded = clerkData?.isLoaded ?? true;
    } catch {
      // Running outside ClerkProvider or SSR
      clerkUserObj = null;
      clerkLoaded = true;
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isClerkConfigured && !clerkLoaded) {
      return;
    }

    if (isClerkConfigured && clerkUserObj) {
      const clerkEmail = clerkUserObj.primaryEmailAddress?.emailAddress || '';
      let canonicalRole: 'LEARNER' | 'MENTOR' | 'ADMIN' = (storeUser?.role?.toUpperCase() as any) || 'LEARNER';
      let dbName = storeUser?.name || clerkUserObj.fullName || clerkUserObj.firstName || clerkEmail.split('@')[0];

      // Check DB synced role from localStorage if not in storeUser
      if (!storeUser?.role) {
        const stored = localStorage.getItem('aven_auth_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.role) {
              canonicalRole = parsed.role.toUpperCase();
            }
            if (parsed.name) {
              dbName = parsed.name;
            }
          } catch (e) {
            console.error('Error parsing stored user', e);
          }
        } else if (clerkEmail.includes('admin@aven.com') || clerkEmail.includes('admin@pathfinder.dev')) {
          canonicalRole = 'ADMIN';
        } else if (clerkEmail.includes('mentor')) {
          canonicalRole = 'MENTOR';
        }
      }

      setLocalUser({
        id: clerkUserObj.id,
        clerk_id: clerkUserObj.id,
        fullName: dbName,
        firstName: (dbName || clerkEmail).split(' ')[0],
        username: clerkUserObj.username || clerkEmail.split('@')[0],
        role: canonicalRole,
        primaryEmailAddress: { emailAddress: clerkEmail },
        imageUrl: clerkUserObj.imageUrl,
      });
      setIsLoaded(true);
      return;
    }

    // 2. Read locally stored session user
    const userToUse = storeUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aven_auth_user') || 'null') : null);
    if (userToUse) {
      const canonicalRole = (userToUse.role || 'LEARNER').toUpperCase() as 'LEARNER' | 'MENTOR' | 'ADMIN';
      setLocalUser({
        id: userToUse.id || 'local_user',
        clerk_id: userToUse.clerk_id,
        fullName: userToUse.name || userToUse.email?.split('@')[0]?.toUpperCase() || 'User',
        firstName: (userToUse.name || userToUse.email || 'User').split(' ')[0],
        username: userToUse.email?.split('@')[0] || 'user',
        role: canonicalRole,
        primaryEmailAddress: { emailAddress: userToUse.email || '' },
      });
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
  }, [clerkUserObj, clerkLoaded, storeUser]);

  return {
    user: localUser,
    isLoaded: isLoaded,
    isSignedIn: !!localUser,
  };
}

export function SafeUserButton({ appearance }: { appearance?: any }) {
  const { user } = useSafeUser();
  let clerkInstance: any = null;

  if (isClerkConfigured) {
    try {
      clerkInstance = useClerk();
    } catch {
      clerkInstance = null;
    }
  }

  const handleSignOut = async () => {
    logoutUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('last_clerk_user');
      localStorage.removeItem('pathfinder_profile_id');
      localStorage.removeItem('pathfinder_diagnostic_complete');
      localStorage.removeItem('aven_auth_token');
      localStorage.removeItem('aven_auth_user');
    }
    if (clerkInstance?.signOut) {
      try {
        await clerkInstance.signOut({ redirectUrl: '/sign-in' });
        return;
      } catch (e) {
        console.error('Clerk sign out error', e);
      }
    }
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
      {user?.imageUrl ? (
        <button
          onClick={handleSignOut}
          className="w-8 h-8 rounded-full overflow-hidden border border-white/20 select-none shadow-sm hover:opacity-90 transition-all cursor-pointer"
          title={`${user?.fullName} (${role}) — Click to Sign Out`}
        >
          <img src={user.imageUrl} alt={user.fullName} className="w-full h-full object-cover" />
        </button>
      ) : (
        <button
          onClick={handleSignOut}
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center font-bold text-white text-xs border border-white/20 select-none shadow-sm hover:opacity-90 transition-all cursor-pointer`}
          title={`${user?.fullName} (${role}) — Click to Sign Out`}
        >
          {initials}
        </button>
      )}
    </div>
  );
}

