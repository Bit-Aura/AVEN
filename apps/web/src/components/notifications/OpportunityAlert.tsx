'use client';

import { useState } from 'react';
import { Sparkles, X, ArrowRight, Zap } from 'lucide-react';

/**
 * Enterprise-grade implementation of OpportunityAlert.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function OpportunityAlert({ skill, spikePercent }: { skill: string, spikePercent: number }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-aven-base border border-brand-500/40 rounded-2xl shadow-glass p-5 max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-aven-primary">
          <Zap size={14} className="text-amber-400" />
          <span>Market Opportunity Alert</span>
        </div>
        <button 
          onClick={() => setVisible(false)} 
          className="text-aven-text-muted hover:text-aven-text-subtle transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-aven-text-subtle leading-relaxed mb-4">
        Market demand for <strong className="text-aven-text font-bold">{skill}</strong> just increased by{' '}
        <span className="text-emerald-400 font-extrabold">+{spikePercent}%</span> across scraped enterprise job boards.
      </p>

      <button 
        onClick={() => setVisible(false)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-aven-text font-bold text-xs rounded-xl shadow-glow-indigo transition-all"
      >
        <span>Prioritize in Path Planner</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}
