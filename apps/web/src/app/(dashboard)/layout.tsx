'use client';

import { ReactNode } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Navbar from '../../components/layout/Navbar';
import AiCoachDrawer from '../../components/AiCoachDrawer';
import IdeSidecar from '../../components/IdeSidecar';
import TrustPanel from '../../components/TrustPanel';
import CommandPalette from '../../components/CommandPalette';
import MicroCelebration from '../../components/MicroCelebration';
import UndoToast from '../../components/UndoToast';
import RoleGuard from '../../components/auth/RoleGuard';
import { usePathStore } from '../../store/usePathStore';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const isFocusMode = usePathStore((state) => state.isFocusMode);

  return (
    <RoleGuard>
      <div className={`h-screen bg-[#faf9f5] flex text-[#141413] overflow-hidden ${
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

        {/* Global Interactive Overlays & Drawers */}
        <AiCoachDrawer />
        <IdeSidecar />
        <TrustPanel />
        <CommandPalette />
        <MicroCelebration />
        <UndoToast />
      </div>
    </RoleGuard>
  );
}
