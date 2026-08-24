'use client';

import { usePathStore } from '../../store/usePathStore';
import { 
  Bot, 
  Zap, 
  Flame, 
  Command, 
  Wifi, 
  WifiOff, 
  ShieldCheck,
  TerminalSquare
} from 'lucide-react';

export default function Navbar() {
  const streak = usePathStore((state) => state.streak);
  const xp = usePathStore((state) => state.xp);
  const isOffline = usePathStore((state) => state.isOffline);
  const toggleOffline = usePathStore((state) => state.toggleOffline);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const openCoach = usePathStore((state) => state.openCoach);
  const openIde = usePathStore((state) => state.openIde);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);
  const toggleCommandPalette = usePathStore((state) => state.toggleCommandPalette);

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Active Milestone Indicator */}
      <div className="flex items-center gap-3">
        {activeMilestone ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">Current Milestone:</span>
            <span className="text-xs font-bold text-slate-200 bg-surface-secondary px-2 py-0.5 rounded border border-border">
              {activeMilestone.title}
            </span>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-400">
            Ground-Truth Deterministic Skill Graph
          </div>
        )}
      </div>

      {/* Right: Actions & Gamification HUD */}
      <div className="flex items-center gap-3">
        {/* Offline Toggle */}
        <button
          onClick={toggleOffline}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
            isOffline
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-surface-secondary border-border text-slate-400 hover:text-slate-200'
          }`}
          title={isOffline ? "Offline Simulation Active" : "Online"}
        >
          {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span>{isOffline ? 'Offline' : 'Online'}</span>
        </button>

        {/* Streak & XP */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-secondary border border-border text-xs font-bold">
          <div className="flex items-center gap-1 text-amber-400">
            <Flame size={14} className="fill-amber-400/20" />
            <span>{streak}d</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1 text-indigo-400">
            <Zap size={14} className="fill-indigo-400/20" />
            <span>{xp} XP</span>
          </div>
        </div>

        {/* Action: IDE */}
        {activeMilestone && (
          <button
            onClick={() => openIde(activeMilestone.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-slate-300 hover:text-white border border-border text-xs font-semibold transition-colors"
            title="Open Sandbox IDE"
          >
            <TerminalSquare size={14} className="text-cyan-400" />
            <span>IDE</span>
          </button>
        )}

        {/* Action: AI Coach */}
        <button
          onClick={() => openCoach(activeMilestone?.id || 'general')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 hover:text-brand-300 border border-brand-500/30 text-xs font-semibold transition-all shadow-glow-indigo"
          title="Ask AI Coach"
        >
          <Bot size={14} />
          <span>AI Coach</span>
        </button>

        {/* Action: Trust Panel */}
        <button
          onClick={toggleTrustPanel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-slate-300 hover:text-white border border-border text-xs font-semibold transition-colors"
          title="View Bayesian Readiness Vector"
        >
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Trust Vector</span>
        </button>

        {/* Action: Command Palette */}
        <button
          onClick={toggleCommandPalette}
          className="p-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-slate-400 hover:text-slate-200 border border-border transition-colors flex items-center justify-center"
          title="Command Palette (Ctrl/Cmd + K)"
        >
          <Command size={14} />
        </button>
      </div>
    </header>
  );
}
