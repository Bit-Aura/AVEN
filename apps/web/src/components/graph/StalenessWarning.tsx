'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Play } from 'lucide-react';
import ProveItAssessment from '../ProveItAssessment';
import { usePathStore } from '../../store/usePathStore';

/**
 * Enterprise-grade implementation of StalenessWarning.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function StalenessWarning({ nodeName, daysStale }: { nodeName: string, daysStale: number }) {
  const [showAssessment, setShowAssessment] = useState(false);
  const startAssessment = usePathStore((state) => state.startAssessment);
  const stopAssessment = usePathStore((state) => state.stopAssessment);

  const handleStart = () => {
    startAssessment();
    setShowAssessment(true);
  };

  if (showAssessment) {
    return (
      <div className="relative z-10">
        <ProveItAssessment milestoneId={nodeName} />
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3 shadow-card">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
        <AlertTriangle size={15} />
        <span>Ebbinghaus Decay Warning</span>
      </div>
      <p className="text-xs text-aven-text-subtle leading-relaxed">
        Skill <strong className="text-aven-text font-bold">{nodeName}</strong> hasn't been reinforced in {daysStale} days. Retentive strength is estimated below threshold.
      </p>
      <button 
        onClick={handleStart}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
      >
        <Play size={13} className="fill-slate-950" />
        <span>Start 3-Min Refresher</span>
      </button>
    </div>
  );
}
