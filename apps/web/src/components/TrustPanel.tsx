'use client';

import { usePathStore } from '../store/usePathStore';
import { ShieldCheck, X, Sparkles, CheckCircle2, Lock, ArrowRight, Activity, AlertTriangle } from 'lucide-react';

export default function TrustPanel() {
  // All hooks MUST be called at top before any conditional returns
  const isTrustPanelOpen = usePathStore((state) => state.isTrustPanelOpen);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);
  const userGoal = usePathStore((state) => state.userGoal);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const nodes = usePathStore((state) => state.nodes);
  const readinessScore = usePathStore((state) => state.readinessScore);
  const targetRole = usePathStore((state) => state.targetRole);

  if (!isTrustPanelOpen) return null;

  // Dynamic readiness metrics based on current state
  const completedNodesCount = nodes.filter(
    n => n.id !== activeMilestone?.id && nodes.indexOf(n) < nodes.findIndex(x => x.id === activeMilestone?.id)
  ).length;

  const progressPercent = readinessScore || (nodes.length > 0 ? Math.round((completedNodesCount / nodes.length) * 100) : 42);
  
  const modules = nodes.map(n => {
    let status = 'locked';
    if (n.id === activeMilestone?.id) status = 'active';
    else if (nodes.indexOf(n) < nodes.findIndex(x => x.id === activeMilestone?.id)) status = 'completed';
    return { name: (n.data as any)?.label || n.id, status };
  });

  const displayModules = modules.length > 0 ? modules : [
    { name: "Python Basics & Core Syntax", status: "active" },
    { name: "SQL & Relational DB Design", status: "locked" },
    { name: "HTTP RESTful API Architectures", status: "locked" },
    { name: "Async FastAPI Microservices", status: "locked" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Blurred Backdrop */}
      <div 
        onClick={toggleTrustPanel}
        className="fixed inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Drawer Content */}
      <div className="relative w-80 md:w-96 bg-surface border-l border-border h-full flex flex-col shadow-glass animate-in slide-in-from-right duration-300 z-10">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface-secondary/40">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <ShieldCheck className="text-brand-400" size={16} />
            </div>
            <span>Bayesian Readiness Vector</span>
          </div>
          <button 
            onClick={toggleTrustPanel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-tertiary transition-colors"
            title="Close Panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Goal Proximity Meter */}
          <div className="p-4 rounded-xl bg-surface-secondary/60 border border-border space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400">Target Role Match</span>
              <span className="font-extrabold text-emerald-400 text-sm">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border">
              <div 
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Calibrated across posterior mastery probabilities for <span className="text-white font-semibold">{targetRole}</span>.
            </p>
          </div>

          {/* Explainability Trace */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-400" />
              <span>Grounded Decision Trace</span>
            </div>
            <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {usePathStore.getState().pathExplanation || 
                (usePathStore.getState().activePathPlan?.decision_trace?.explanation || 
                "PathFinder computes prerequisite paths deterministically through Neo4j topological sorting. Active focus is placed strictly on the nearest unmastered node to maximize velocity.")}
            </div>
          </div>

          {/* Time Budget Reality Check */}
          {usePathStore.getState().activePathPlan?.decision_trace?.time_budget_warning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs mt-4">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-400 uppercase tracking-wider">
                <AlertTriangle size={13} />
                Time Budget Warning
              </div>
              <p>The projected time to complete this path ({usePathStore.getState().activePathPlan?.decision_trace?.estimated_hours} hrs) exceeds your requested timeline. Consider negotiating scope or increasing weekly hours.</p>
            </div>
          )}

          {/* Milestone Status Breakdown */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity size={13} className="text-brand-400" />
              <span>Topological Pipeline</span>
            </div>
            <div className="space-y-2">
              {displayModules.map((mod, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    mod.status === 'completed'
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : mod.status === 'active'
                      ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 font-bold'
                      : 'bg-surface-secondary/30 border-border text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {mod.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                    {mod.status === 'active' && <Sparkles size={14} className="text-brand-400 shrink-0" />}
                    {mod.status === 'locked' && <Lock size={13} className="text-slate-500 shrink-0" />}
                    <span className="truncate">{mod.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold shrink-0 ml-2">
                    {mod.status === 'completed' ? 'Mastered' : mod.status === 'active' ? 'Active' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
