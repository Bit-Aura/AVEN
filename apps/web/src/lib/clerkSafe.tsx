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

      if (canonicalRole === 'MENTOR' || canonicalRole === 'ADMIN') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pathfinder_diagnostic_complete', 'true');
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
      if (canonicalRole === 'MENTOR' || canonicalRole === 'ADMIN') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pathfinder_diagnostic_complete', 'true');
        }
      }
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

export function SafeUserButton({ appearance, placement = 'top-left' }: { appearance?: any, placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const popupClasses = placement.includes('top') ? 'bottom-full mb-2' : 'top-full mt-2';
  const alignClasses = placement.includes('right') ? 'right-0' : 'left-0';
  const { user } = useSafeUser();
  const [isOpen, setIsOpen] = useState(false);
  let clerkInstance: any = null;

  if (isClerkConfigured) {
    try {
      clerkInstance = useClerk();
    } catch {
      clerkInstance = null;
    }
  }

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
    <div className="relative flex items-center gap-2">
      {user?.imageUrl ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-full overflow-hidden border border-white/20 select-none shadow-sm hover:opacity-90 transition-all cursor-pointer"
        >
          <img src={user.imageUrl} alt={user.fullName} className="w-full h-full object-cover" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center font-bold text-white text-xs border border-white/20 select-none shadow-sm hover:opacity-90 transition-all cursor-pointer`}
        >
          {initials}
        </button>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute ${popupClasses} ${alignClasses} w-64 bg-[#2b2b2a] border border-[#3d3d3a] rounded-lg shadow-xl z-50 p-4 text-[#faf9f5]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#87867f]">User Profile</span>
              <button onClick={() => setIsOpen(false)} className="text-[#87867f] hover:text-[#faf9f5]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#3d3d3a]">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-10 h-10 rounded-full border border-white/20" />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center font-bold text-white text-sm border border-white/20`}>
                  {initials}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="text-sm font-black truncate">{user?.fullName}</div>
                <div className="text-[10px] text-[#87867f] truncate">{user?.primaryEmailAddress?.emailAddress}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#87867f] font-bold">Role</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${role === 'ADMIN' ? 'bg-rose-500/20 text-rose-400' : role === 'MENTOR' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{role}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
