'use client';

import { useEffect } from 'react';
import { usePathStore } from '../../../../store/usePathStore';
import SkillGraph from '../../../../components/SkillGraph';
import StalenessWarning from '../../../../components/graph/StalenessWarning';
import { Network, Info, Sparkles, Layers, ShieldCheck } from 'lucide-react';

export default function GraphPage() {
  const fetchActivePath = usePathStore((state) => state.fetchActivePath);
  const nodes = usePathStore((state) => state.nodes);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const targetRole = usePathStore((state) => state.targetRole);

  useEffect(() => {
    if (nodes.length === 0) {
      fetchActivePath();
    }
  }, [nodes.length, fetchActivePath]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Prerequisite DAG</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Deterministic Skill Graph
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing top-sorted prerequisite tree for <span className="text-white font-semibold">{targetRole}</span>
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-surface border border-border px-3.5 py-2 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Mastered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-slate-300 font-bold">Active Focus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span className="text-slate-400">Locked Prereq</span>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 bg-surface border border-border rounded-2xl p-4 shadow-glass">
          <SkillGraph />
        </div>

        <aside className="space-y-6">
          {/* Active Node Card */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-glass">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Current Target</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {activeMilestone?.title || "Python Basics"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {activeMilestone?.explanation || "Mastering this concept clears dependencies for downstream API design and async service architecture."}
            </p>
          </div>

          {/* Ebbinghaus Decay / Staleness Warning */}
          <StalenessWarning 
            nodeName="HTTP Protocol & Methods" 
            daysStale={18} 
          />

          <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border text-xs text-slate-400 flex items-start gap-2.5">
            <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Prerequisite paths are computed deterministically via NetworkX topological sorting. Zero hallucinated dependencies.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
