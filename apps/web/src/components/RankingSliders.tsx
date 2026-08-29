'use client';

import { useState, useEffect } from 'react';
import { usePathStore, RankingPreferences } from '../store/usePathStore';
import { Settings2, Zap, Brain, DollarSign, Gift, PlaySquare, Briefcase } from 'lucide-react';

/**
 * Enterprise-grade implementation of RankingSliders.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function RankingSliders() {
  const rankingPreferences = usePathStore((state) => state.rankingPreferences);
  const updateRankingPreference = usePathStore((state) => state.updateRankingPreference);
  const isFocusMode = usePathStore((state) => state.isFocusMode);

  const [isSimulating, setIsSimulating] = useState(false);

  // Trigger a visual simulation whenever a slider changes
  useEffect(() => {
    setIsSimulating(true);
    const timeout = setTimeout(() => {
      setIsSimulating(false);
    }, 800); // 800ms "re-calculation"
    return () => clearTimeout(timeout);
  }, [rankingPreferences]);

  if (isFocusMode) return null; // Hide in Focus Mode

  const renderSlider = (
    key: keyof RankingPreferences,
    labelLeft: string, 
    labelRight: string, 
    IconLeft: React.ElementType, 
    IconRight: React.ElementType,
    value: number
  ) => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-xs font-semibold text-aven-text-subtle uppercase tracking-wider">
        <div className="flex items-center gap-1.5"><IconLeft size={14} className="text-aven-primary" /> {labelLeft}</div>
        <div className="flex items-center gap-1.5">{labelRight} <IconRight size={14} className="text-emerald-400" /></div>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={value}
        onChange={(e) => updateRankingPreference(key, parseInt(e.target.value))}
        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
      />
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
      
      {/* Simulation Overlay */}
      <div className={`absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 ${isSimulating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-2 text-aven-primary font-semibold bg-slate-900 px-4 py-2 rounded-full border border-aven-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <Settings2 size={16} className="animate-spin" />
          <span>Re-ranking Path...</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Settings2 className="text-aven-text-subtle" size={18} />
        <h3 className="font-bold text-aven-text">Path Constraints</h3>
      </div>

      <div className="flex flex-col gap-6">
        {renderSlider('speedVsDepth', 'Fast Track', 'Deep Dive', Zap, Brain, rankingPreferences.speedVsDepth)}
        {renderSlider('freeVsPaid', 'Free Resources', 'Paid Courses', Gift, DollarSign, rankingPreferences.freeVsPaid)}
        {renderSlider('videoVsProject', 'Video Lectures', 'Project-Based', PlaySquare, Briefcase, rankingPreferences.videoVsProject)}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800">
        <p className="text-xs text-aven-text-muted leading-relaxed">
          PathFinder's deterministic engine is live-reranking the resource graph based on your explicit preferences.
        </p>
      </div>
    </div>
  );
}
