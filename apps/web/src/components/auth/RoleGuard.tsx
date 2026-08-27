'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSafeUser } from '../../lib/clerkSafe';
import { usePathStore } from '../../store/usePathStore';

interface RoleGuardProps {
  children: React.ReactNode;
}

export default function RoleGuard({ children }: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useSafeUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const role = (user.role || 'LEARNER').toUpperCase();

    // Mentors and Admins bypass cold-start diagnostics completely
    if (role === 'MENTOR' || role === 'ADMIN') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pathfinder_diagnostic_complete', 'true');
      }
      usePathStore.setState({ diagnosticComplete: true });
    }

    // 1. Guard Admin Routes
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      if (role === 'MENTOR') {
        router.replace('/mentor');
      } else {
        router.replace('/learner');
      }
      return;
    }

    // 2. Guard Mentor Routes
    if (pathname.startsWith('/mentor') && role === 'LEARNER') {
      router.replace('/learner');
      return;
    }

    // 3. Mentors landing on Learner routes are routed directly to Mentor Operations
    if (pathname.startsWith('/learner') && role === 'MENTOR') {
      router.replace('/mentor');
      return;
    }
  }, [pathname, user, isLoaded, router]);

  return <>{children}</>;
}
