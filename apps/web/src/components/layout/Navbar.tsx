'use client';

import { usePathStore } from '../../store/usePathStore';
import { ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);

  return (
    <header className="h-16 bg-aven-base border-b border-aven-border px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Active Milestone Indicator */}
      <div className="flex items-center gap-3">
        {activeMilestone ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-aven-primary animate-pulse" />
            <span className="text-xs text-aven-text-subtle uppercase font-bold tracking-widest">Current Milestone:</span>
            <span className="text-xs font-bold text-aven-base bg-aven-primary px-2 py-0.5 rounded border border-aven-primary">
              {activeMilestone.title}
            </span>
          </div>
        ) : (
          <div className="text-xs font-bold uppercase tracking-widest text-aven-text-subtle">
            Ground-Truth Deterministic Skill Graph
          </div>
        )}
      </div>

      {/* Right: Actions & Gamification HUD */}
      <div className="flex items-center gap-3">
        {/* Action: Trust Panel */}
        <button
          onClick={toggleTrustPanel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aven-surface hover:bg-aven-base text-aven-text border border-aven-surface text-xs font-bold transition-colors uppercase tracking-widest group"
          title="View Bayesian Readiness Vector"
        >
          <ShieldCheck size={14} className="text-aven-text" />
          <span>Trust Vector</span>
        </button>
      </div>
    </header>
  );
}
