'use client';

import { usePathStore } from '../../store/usePathStore';
import { ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);

  return (
    <header className="h-16 bg-[#3d3d3a] border-l border-[#141413]/20 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Active Milestone Indicator */}
      <div className="flex items-center gap-3">
        {activeMilestone ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#faf9f5] animate-pulse" />
            <span className="text-xs text-[#faf9f5]/70 uppercase font-bold tracking-widest">Current Milestone:</span>
            <span className="text-xs font-bold text-[#141413] bg-[#e8e6dc] px-2 py-0.5 rounded border border-[#e8e6dc]">
              {activeMilestone.title}
            </span>
          </div>
        ) : (
          <div className="text-xs font-bold uppercase tracking-widest text-[#faf9f5]/70">
            Ground-Truth Deterministic Skill Graph
          </div>
        )}
      </div>

      {/* Right: Actions & Gamification HUD */}
      <div className="flex items-center gap-3">
        {/* Action: Trust Panel */}
        <button
          onClick={toggleTrustPanel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8e6dc] hover:bg-[#faf9f5] text-[#141413] border border-[#e8e6dc] text-xs font-bold transition-colors uppercase tracking-widest group"
          title="View Bayesian Readiness Vector"
        >
          <ShieldCheck size={14} className="text-[#141413]" />
          <span>Trust Vector</span>
        </button>
      </div>
    </header>
  );
}
