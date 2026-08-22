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
import ProofCard from '../components/ProofCard';
import { usePathStore } from '../store/usePathStore';
import { Wifi, WifiOff, Focus } from 'lucide-react';

export default function Home() {
  const userGoal = usePathStore((state) => state.userGoal);
  const diagnosticComplete = usePathStore((state) => state.diagnosticComplete);
  const isTrustPanelOpen = usePathStore((state) => state.isTrustPanelOpen);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);
  const isOffline = usePathStore((state) => state.isOffline);
  const toggleOffline = usePathStore((state) => state.toggleOffline);
  const isFocusMode = usePathStore((state) => state.isFocusMode);
  const toggleFocusMode = usePathStore((state) => state.toggleFocusMode);

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
      
      {/* Background Dimming for Focus Mode */}
      <div className={`absolute inset-0 bg-slate-950/80 z-10 transition-opacity duration-700 pointer-events-none ${isFocusMode ? 'opacity-100' : 'opacity-0'}`} />

      <div className={`flex-1 flex flex-col transition-all duration-700 ${isFocusMode ? 'opacity-30 blur-sm grayscale pointer-events-none' : ''}`}>
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
              onClick={toggleFocusMode}
              className={`p-2 rounded-lg border transition-colors flex items-center justify-center shadow-lg ${
                isFocusMode 
                  ? 'bg-indigo-900/50 border-indigo-700 text-indigo-400 hover:bg-indigo-900/70' 
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-indigo-400'
              }`}
              title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            >
              <Focus size={20} />
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
      
      {/* Milestone Card - Elevated during Focus Mode */}
      <div className={`w-full md:w-96 flex flex-col gap-6 pt-[88px] transition-all duration-700 ${isFocusMode ? 'relative z-20 scale-105' : ''}`}>
        <h2 className={`text-2xl font-bold mb-2 transition-colors ${isFocusMode ? 'text-indigo-300' : ''}`}>Active Milestone</h2>
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

      {/* Proof Card Overlay */}
      <ProofCard />
    </main>
  );
}
