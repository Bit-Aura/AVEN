'use client';

import SkillGraph from '../components/SkillGraph';
import MilestoneCard from '../components/MilestoneCard';
import GoalChat from '../components/GoalChat';
import DiagnosticChat from '../components/DiagnosticChat';
import TrustPanel from '../components/TrustPanel';
import PresenceBar from '../components/PresenceBar';
import IdeSidecar from '../components/IdeSidecar';
import AiCoachDrawer from '../components/AiCoachDrawer';
import OfflineSyncBanner from '../components/OfflineSyncBanner';
import GamificationHud from '../components/GamificationHud';
import MicroCelebration from '../components/MicroCelebration';
import UndoToast from '../components/UndoToast';
import CommandPalette from '../components/CommandPalette';
import { usePathStore } from '../store/usePathStore';
import { Wifi, WifiOff } from 'lucide-react';

export default function Home() {
  const userGoal = usePathStore((state) => state.userGoal);
  const diagnosticComplete = usePathStore((state) => state.diagnosticComplete);
  const isTrustPanelOpen = usePathStore((state) => state.isTrustPanelOpen);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);
  const isOffline = usePathStore((state) => state.isOffline);
  const toggleOffline = usePathStore((state) => state.toggleOffline);

  // 1. If the user hasn't set a goal yet, show the GoalChat UI fullscreen.
  if (!userGoal) {
    return <GoalChat />;
  }

  // 2. If the user has a goal but hasn't completed the diagnostic, show the diagnostic chat.
  if (!diagnosticComplete) {
    return <DiagnosticChat />;
  }

  // 3. Once both are complete, show the actual dashboard.
  const dummyMilestone = {
    id: '1',
    title: 'Python Basics',
    explanation: 'Based on your diagnostic, this is the most critical starting point for Backend Engineering. Python provides the fundamental syntax and concepts you will use for the rest of your path.',
    status: 'active' as const,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your PathFinder Learning Graph</h1>
            <div className="flex items-center gap-4">
              <p className="text-slate-400 font-medium px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg inline-block">
                Goal: <span className="text-emerald-400">{userGoal}</span>
              </p>
              <PresenceBar />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleOffline}
              className={`p-2 rounded-lg border transition-colors flex items-center justify-center shadow-lg ${
                isOffline 
                  ? 'bg-amber-900/50 border-amber-700 text-amber-500 hover:bg-amber-900/70' 
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-emerald-400'
              }`}
              title={isOffline ? "Go Online" : "Simulate Offline Mode"}
            >
              {isOffline ? <WifiOff size={20} /> : <Wifi size={20} />}
            </button>
            <button 
              onClick={toggleTrustPanel}
              className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center gap-2 shadow-lg"
            >
              <span>⚡</span> Why this path?
            </button>
          </div>
        </div>
        <SkillGraph />
      </div>
      <div className="w-full md:w-96 flex flex-col gap-6 pt-[88px]">
        <h2 className="text-2xl font-bold mb-2">Active Milestone</h2>
        <MilestoneCard milestone={dummyMilestone} />
      </div>

      {/* Trust Panel Overlay */}
      {isTrustPanelOpen && (
        <div className="absolute top-0 right-0 h-full z-40">
          <TrustPanel />
        </div>
      )}

      {/* Gamification HUD */}
      <GamificationHud />

      {/* IDE Sidecar Overlay */}
      <IdeSidecar />

      {/* AI Coach Overlay */}
      <AiCoachDrawer />

      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Micro-celebration Overlay */}
      <MicroCelebration />

      {/* Undo Toast */}
      <UndoToast />

      {/* Command Palette */}
      <CommandPalette />
    </main>
  );
}
