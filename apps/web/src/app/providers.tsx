'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/nextjs';
import { usePathStore } from '../store/usePathStore';
import { isClerkConfigured } from '../lib/clerkSafe';
import { syncClerkUser } from '../api/client';

/**
 * Enterprise-grade implementation of RealClerkSync.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
function RealClerkSync() {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  
  useEffect(() => {
    if (!isLoaded) return;
    
    const lastUser = localStorage.getItem('last_clerk_user');
    
    if (userId && lastUser && lastUser !== userId) {
      localStorage.removeItem('pathfinder_profile_id');
      localStorage.removeItem('pathfinder_diagnostic_complete');
      localStorage.removeItem('aven_auth_token');
      localStorage.removeItem('aven_auth_user');
      usePathStore.setState({ profileId: null, diagnosticComplete: false, nodes: [], edges: [], activePathPlan: null });
    }
    
    if (userId && user) {
      localStorage.setItem('last_clerk_user', userId);
      const email = user.primaryEmailAddress?.emailAddress;
      const pendingRole = typeof window !== 'undefined' ? localStorage.getItem('pending_signup_role') : null;
      if (email) {
        syncClerkUser({
          clerk_id: userId,
          email: email,
          name: user.fullName || user.firstName || email.split('@')[0],
          image_url: user.imageUrl,
          role: pendingRole || undefined,
        }).then((res) => {
          if (res && res.profile_id) {
            usePathStore.setState({ profileId: res.profile_id });
          }
          if (res && res.user) {
            usePathStore.getState().setCurrentUser(res.user);
          }
          if (pendingRole) {
            localStorage.removeItem('pending_signup_role');
          }
        }).catch((err) => {
          console.error('[ClerkSync] Failed to sync user with backend DB:', err);
        });
      }
    } else if (userId === null) {
      localStorage.removeItem('last_clerk_user');
      localStorage.removeItem('pathfinder_profile_id');
      localStorage.removeItem('pathfinder_diagnostic_complete');
      usePathStore.setState({ profileId: null, diagnosticComplete: false, nodes: [], edges: [], activePathPlan: null });
    }
  }, [userId, isLoaded, user]);
  
  return null;
}

/**
 * Enterprise-grade implementation of ClerkSync.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
function ClerkSync() {
  if (!isClerkConfigured) {
    return null;
  }
  return <RealClerkSync />;
}

/**
 * Enterprise-grade implementation of Providers.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkSync />
      {children}
    </QueryClientProvider>
  );
}
