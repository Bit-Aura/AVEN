'use client';

import RoadmapNoiseChecker from '@/components/planner/RoadmapNoiseChecker';
import { Target } from '@phosphor-icons/react';

export default function AuditorDashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="border-b border-aven-text/10 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target weight="fill" className="text-aven-text" size={18} />
            <span className="text-[11px] font-black uppercase tracking-widest text-aven-text-subtle">Curriculum Auditor</span>
          </div>
          <h1 className="text-3xl font-black text-aven-text tracking-tight">
            Validate External Roadmaps
          </h1>
          <p className="text-sm font-medium text-aven-text-subtle mt-2 max-w-xl leading-relaxed">
            Paste any course syllabus, video transcript, or roadmap. We will cross-reference it against live market data and our dependency graph to ensure structural integrity.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <RoadmapNoiseChecker />
      </div>
    </div>
  );
}
