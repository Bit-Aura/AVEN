'use client';

import { ShieldCheck } from 'lucide-react';

export default function ReadinessBar({ percentage }: { percentage: number }) {
  const clamped = Math.min(100, Math.max(0, percentage || 0));

  return (
    <div className="flex flex-col items-end gap-1.5 select-none">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-emerald-400" size={20} />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bayesian Readiness:</span>
        <span className="text-xl font-extrabold text-emerald-400 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          {clamped}%
        </span>
      </div>
      <div className="w-48 h-2 bg-surface-secondary rounded-full overflow-hidden border border-border">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500 text-right">
        Grounded in BKT posterior mastery probabilities.
      </p>
    </div>
  );
}
