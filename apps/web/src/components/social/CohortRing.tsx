'use client';

import { Users, Sparkles } from 'lucide-react';

export default function CohortRing({ cohortName, members }: { cohortName: string, members: string[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-glass space-y-3 max-w-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Users size={14} className="text-brand-400" />
          <span>Cohort: {cohortName}</span>
        </h3>
        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          Sync Active
        </span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Learners currently traversing this exact sub-graph branch.
      </p>
      <div className="flex -space-x-2 pt-1">
        {members.map((initials, idx) => (
          <div 
            key={idx} 
            className="w-8 h-8 rounded-full border-2 border-surface bg-brand-600 text-white font-bold text-xs flex items-center justify-center shadow-sm"
          >
            {initials}
          </div>
        ))}
      </div>
    </div>
  );
}
