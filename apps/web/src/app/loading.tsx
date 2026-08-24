'use client';

import { BrainCircuit, Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center gap-5 max-w-sm text-center shadow-glass animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center shadow-glow-indigo">
          <BrainCircuit className="text-brand-400" size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Traversing Skill Graph...</h2>
          <p className="text-xs text-slate-400 mt-1">Calibrating Bayesian priors & prerequisite DAGs</p>
        </div>
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    </div>
  );
}
