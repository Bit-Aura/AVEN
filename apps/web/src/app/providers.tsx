'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { usePathStore } from '../store/usePathStore';

function ClerkSync() {
  const { userId, isLoaded } = useAuth();
  
  useEffect(() => {
    if (!isLoaded) return;
    
    const lastUser = localStorage.getItem('last_clerk_user');
    
    if (userId && lastUser && lastUser !== userId) {
      localStorage.removeItem('pathfinder_profile_id');
      localStorage.removeItem('pathfinder_diagnostic_complete');
      usePathStore.setState({ profileId: null, diagnosticComplete: false, nodes: [], edges: [], activePathPlan: null });
    }
    
    if (userId) {
      localStorage.setItem('last_clerk_user', userId);
    } else if (userId === null) {
      localStorage.removeItem('last_clerk_user');
      localStorage.removeItem('pathfinder_profile_id');
      localStorage.removeItem('pathfinder_diagnostic_complete');
      usePathStore.setState({ profileId: null, diagnosticComplete: false, nodes: [], edges: [], activePathPlan: null });
    }
  }, [userId, isLoaded]);
  
  return null;
}

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
