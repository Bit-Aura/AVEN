'use client';

import { usePathStore } from '../store/usePathStore';

export default function TrustPanel() {
  const isTrustPanelOpen = usePathStore((state) => state.isTrustPanelOpen);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);

  if (!isTrustPanelOpen) return null;

  const userGoal = usePathStore((state) => state.userGoal);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const nodes = usePathStore((state) => state.nodes);

  // Dynamic readiness metrics based on current state
  const completedNodesCount = nodes.filter(n => n.id !== activeMilestone?.id && nodes.indexOf(n) < nodes.findIndex(x => x.id === activeMilestone?.id)).length;
  const progressPercent = nodes.length > 0 ? Math.round((completedNodesCount / nodes.length) * 100) : 15;
  
  const modules = nodes.map(n => {
    let status = 'locked';
    if (n.id === activeMilestone?.id) status = 'active';
    else if (nodes.indexOf(n) < nodes.findIndex(x => x.id === activeMilestone?.id)) status = 'completed';
    return { name: (n.data as any)?.label || n.id, status };
  });

  const readinessMetrics = {
    overall: progressPercent,
    modules: modules.length > 0 ? modules : [
      { name: "Initial Assessment", status: "completed" },
      { name: "Path Generation", status: "active" }
    ],
    reasoning: `Based on your diagnostic, you have demonstrated a foundation to begin your journey toward "${userGoal || 'your goal'}". The AI has plotted this optimal path to fast-track you, focusing heavily on your most critical gaps first.`
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
        <h2 className="font-bold text-slate-100 flex items-center gap-2">
          <span className="text-blue-400">⚡</span> Readiness Vector
        </h2>
        <button 
          onClick={toggleTrustPanel}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          title="Close Panel"
        >
          ✕
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Goal Proximity</h3>
          <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
              style={{ width: `${readinessMetrics.overall}%` }}
            />
          </div>
          <p className="text-right text-xs font-bold text-emerald-400 mt-2">{readinessMetrics.overall}% Ready</p>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Why this path?</h3>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
            {readinessMetrics.reasoning}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Milestone Impact</h3>
          <div className="flex flex-col gap-3">
            {readinessMetrics.modules.map((mod, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <span className="text-slate-200 font-medium">{mod.name}</span>
                {mod.status === 'completed' && <span className="text-emerald-400 text-xs font-bold">✓ DONE</span>}
                {mod.status === 'active' && <span className="text-blue-400 text-xs font-bold">ACTIVE</span>}
                {mod.status === 'locked' && <span className="text-slate-500 text-xs font-bold">LOCKED</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
