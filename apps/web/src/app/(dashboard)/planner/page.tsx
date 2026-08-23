'use client';

import SkillGraph from '../../../components/SkillGraph';
import RoadmapNoiseChecker from '../../../components/planner/RoadmapNoiseChecker';
import { Network } from 'lucide-react';

export default function PlannerDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase text-white flex items-center gap-3">
            <Network className="text-indigo-400" size={36} />
            Learning Planner
          </h1>
          <p className="text-xl font-bold mt-2 text-slate-400">Path Generation & Visualization</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <SkillGraph />
        
        <RoadmapNoiseChecker />
      </main>
    </div>
  );
}
