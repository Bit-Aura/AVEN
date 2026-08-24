'use client';

import SkillGraph from '../../../components/SkillGraph';
import RoadmapNoiseChecker from '../../../components/planner/RoadmapNoiseChecker';
import { Layers } from 'lucide-react';

export default function PlannerDashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="text-brand-400" size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Path Architecture</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Learning Planner & Dependency Auditor
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Explore graph topologies and audit external curriculum advice for structural sanity
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-glass">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Interactive Path Canvas
          </h2>
          <SkillGraph />
        </div>

        <RoadmapNoiseChecker />
      </div>
    </div>
  );
}
