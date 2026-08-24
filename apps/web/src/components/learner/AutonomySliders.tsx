'use client';

import { usePathStore } from '../../store/usePathStore';
import { Sliders, Zap } from 'lucide-react';

export default function AutonomySliders() {
  const rankingPreferences = usePathStore((state) => state.rankingPreferences);
  const updatePreference = usePathStore((state) => state.updateRankingPreference);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-border pb-2">
        <div className="flex items-center gap-1.5 font-bold uppercase text-slate-300">
          <Sliders size={14} className="text-indigo-400" />
          <span>Curriculum Tuning</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <Zap size={10} /> Live Re-route
        </span>
      </div>

      {/* Speed vs Depth */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-300">
          <span className="text-slate-400">Fast-Track</span>
          <span>Deep Mastery</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={rankingPreferences.speedVsDepth} 
          onChange={(e) => updatePreference('speedVsDepth', Number(e.target.value))}
          className="w-full h-1.5 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-brand-500" 
        />
      </div>

      {/* Theory vs Practice */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-300">
          <span className="text-slate-400">Theoretical</span>
          <span>Hands-on Project</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={rankingPreferences.theoryVsPractice} 
          onChange={(e) => updatePreference('theoryVsPractice', Number(e.target.value))}
          className="w-full h-1.5 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500" 
        />
      </div>

      {/* Free vs Paid Resources */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-300">
          <span className="text-slate-400">Free Resources</span>
          <span>Paid Credentials</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={rankingPreferences.freeVsPaid} 
          onChange={(e) => updatePreference('freeVsPaid', Number(e.target.value))}
          className="w-full h-1.5 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-cyan-500" 
        />
      </div>

      <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border text-[11px] text-slate-400 leading-relaxed">
        Adjusting preference weights updates topological resource ranking without altering prerequisite correctness.
      </div>
    </div>
  );
}
