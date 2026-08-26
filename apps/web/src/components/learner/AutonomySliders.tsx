'use client';

import { useState, useRef, useCallback } from 'react';
import { usePathStore, RankingPreferences } from '../../store/usePathStore';
import { Sliders, Zap, Check, Loader2 } from 'lucide-react';

export default function AutonomySliders() {
  const rankingPreferences = usePathStore((state) => state.rankingPreferences);
  const setLocalPreference = usePathStore((state) => state.setLocalRankingPreference);
  const commitPreferences = usePathStore((state) => state.commitRankingPreferences);

  const [status, setStatus] = useState<'idle' | 'updating' | 'success'>('idle');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerDebouncedCommit = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setStatus('updating');
      try {
        await commitPreferences();
        setStatus('success');
        statusTimerRef.current = setTimeout(() => {
          setStatus('idle');
        }, 2200);
      } catch {
        setStatus('idle');
      }
    }, 500);
  }, [commitPreferences]);

  const handleChange = (key: keyof RankingPreferences, value: number) => {
    setLocalPreference(key, value);
    triggerDebouncedCommit();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-border pb-2">
        <div className="flex items-center gap-1.5 font-bold uppercase text-slate-300">
          <Sliders size={14} className="text-indigo-400" />
          <span>Curriculum Tuning</span>
        </div>

        {status === 'updating' ? (
          <span className="text-[10px] text-brand-400 font-semibold flex items-center gap-1 animate-pulse">
            <Loader2 size={10} className="animate-spin" /> Optimizing...
          </span>
        ) : status === 'success' ? (
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
            <Check size={10} /> Path Re-ranked
          </span>
        ) : (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <Zap size={10} /> Live Re-route
          </span>
        )}
      </div>

      {/* Speed vs Depth */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-300">
          <span className="text-slate-400">Fast-Track ({100 - rankingPreferences.speedVsDepth}%)</span>
          <span className="text-brand-300">Deep Mastery ({rankingPreferences.speedVsDepth}%)</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={rankingPreferences.speedVsDepth} 
          onChange={(e) => handleChange('speedVsDepth', Number(e.target.value))}
          className="w-full h-1.5 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-brand-500" 
        />
      </div>

      {/* Theory vs Practice */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-300">
          <span className="text-slate-400">Theoretical ({100 - rankingPreferences.theoryVsPractice}%)</span>
          <span className="text-emerald-300">Hands-on Project ({rankingPreferences.theoryVsPractice}%)</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={rankingPreferences.theoryVsPractice} 
          onChange={(e) => handleChange('theoryVsPractice', Number(e.target.value))}
          className="w-full h-1.5 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500" 
        />
      </div>

      {/* Free vs Paid Resources */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-300">
          <span className="text-slate-400">Free ({100 - rankingPreferences.freeVsPaid}%)</span>
          <span className="text-cyan-300">Paid Credentials ({rankingPreferences.freeVsPaid}%)</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={rankingPreferences.freeVsPaid} 
          onChange={(e) => handleChange('freeVsPaid', Number(e.target.value))}
          className="w-full h-1.5 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-cyan-500" 
        />
      </div>

      <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border text-[11px] text-slate-400 leading-relaxed">
        Adjusting preference weights updates topological resource ranking without altering prerequisite correctness.
      </div>
    </div>
  );
}
