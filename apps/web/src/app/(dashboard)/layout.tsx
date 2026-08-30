import { ReactNode } from 'react';
import DashboardShell from './DashboardShell';

/**
 * Dashboard layout — kept as a Server Component so Next.js can stream HTML,
 * prefetch route segments, and avoid forcing the full client JS bundle to
 * download before first paint.
 *
 * All client-side logic (Zustand store, lazy overlays, RoleGuard) lives in
 * the DashboardShell client component.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
