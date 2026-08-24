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
import { usePathStore } from '../../store/usePathStore';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const isFocusMode = usePathStore((state) => state.isFocusMode);

  return (
    <div className={`min-h-screen bg-background flex text-slate-100 overflow-x-hidden ${
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
  );
}
