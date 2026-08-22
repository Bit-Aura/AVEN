'use client';

import { usePathStore } from '../store/usePathStore';

export default function TrustPanel() {
  const isTrustPanelOpen = usePathStore((state) => state.isTrustPanelOpen);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);

  if (!isTrustPanelOpen) return null;

  // Mocking the readiness vector calculation for MVP
  const readinessMetrics = {
    overall: 15,
    modules: [
      { name: "Python Basics", status: "completed" },
      { name: "API Design", status: "active" },
      { name: "Database Schema", status: "locked" }
    ],
    reasoning: "Based on your diagnostic, you already possess basic programming knowledge. The AI has plotted this optimal path to fast-track you into Backend Engineering, focusing heavily on API construction and Data Modeling."
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
