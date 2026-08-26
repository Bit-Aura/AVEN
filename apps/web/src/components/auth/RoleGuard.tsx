'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSafeUser } from '../../lib/clerkSafe';

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

    // Guard Admin Routes
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      if (role === 'MENTOR') {
        router.replace('/mentor');
      } else {
        router.replace('/learner');
      }
      return;
    }

    // Guard Mentor Routes
    if (pathname.startsWith('/mentor') && role === 'LEARNER') {
      router.replace('/learner');
      return;
    }
  }, [pathname, user, isLoaded, router]);

  return <>{children}</>;
}
