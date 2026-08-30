'use client';

import { ReactNode, lazy, Suspense } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Navbar from '../../components/layout/Navbar';
import RoleGuard from '../../components/auth/RoleGuard';
import CommandPalette from '../../components/CommandPalette';
import { usePathStore } from '../../store/usePathStore';

// Lazy-load heavy overlay components — they only mount when their store flag
// is true, so the JS is fetched on-demand instead of blocking every page load.
// This removes ~5 MB (Monaco Editor alone) from the critical path.
const AiCoachDrawer = lazy(() => import('../../components/AiCoachDrawer'));
const IdeSidecar = lazy(() => import('../../components/IdeSidecar'));
const TrustPanel = lazy(() => import('../../components/TrustPanel'));
const MicroCelebration = lazy(() => import('../../components/MicroCelebration'));
const UndoToast = lazy(() => import('../../components/UndoToast'));

/**
 * Client-side dashboard shell that handles:
 * - Focus mode class toggling (requires Zustand store)
 * - Role-based route guarding
 * - Lazy-loaded overlay components (only mounted when open)
 *
 * Extracted from the dashboard layout so that layout.tsx can remain a
 * Server Component — unlocking Next.js streaming, prefetching, and RSC benefits.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const isFocusMode = usePathStore((state) => state.isFocusMode);
  const activeCoachNodeId = usePathStore((state) => state.activeCoachNodeId);
  const activeIdeNodeId = usePathStore((state) => state.activeIdeNodeId);
  const isTrustPanelOpen = usePathStore((state) => state.isTrustPanelOpen);
  const showCelebration = usePathStore((state) => state.showCelebration);
  const showUndoToast = usePathStore((state) => state.showUndoToast);

  return (
    <RoleGuard>
      <div className={`h-screen bg-aven-base flex text-aven-text overflow-hidden ${
        isFocusMode ? 'focus-mode-active' : ''
      }`}>
        {/* Persistent Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* CommandPalette stays always mounted because it registers global
            keyboard shortcuts (Cmd+K, Cmd+I, Cmd+H) that must work even
            when the palette is closed. It's lightweight (~8 KB). */}
        <CommandPalette />

        {/* Heavy overlays — lazy-loaded, only mounted when their trigger
            flag is set. This keeps Monaco (~5 MB) and other large bundles
            out of the critical path until actually needed. */}
        <Suspense fallback={null}>
          {activeCoachNodeId && <AiCoachDrawer />}
          {activeIdeNodeId && <IdeSidecar />}
          {isTrustPanelOpen && <TrustPanel />}
          {showCelebration && <MicroCelebration />}
          {showUndoToast && <UndoToast />}
        </Suspense>
      </div>
    </RoleGuard>
  );
}
