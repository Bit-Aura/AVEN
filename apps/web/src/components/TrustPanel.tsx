'use client';

import { usePathStore } from '../store/usePathStore';
import { ShieldCheck, X, Sparkles, CheckCircle2, Lock, Activity, AlertTriangle } from 'lucide-react';

export default function TrustPanel() {
  // All hooks MUST be called at top before any conditional returns
  const isTrustPanelOpen = usePathStore((state) => state.isTrustPanelOpen);
  const toggleTrustPanel = usePathStore((state) => state.toggleTrustPanel);
  const targetRole = usePathStore((state) => state.targetRole);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const nodes = usePathStore((state) => state.nodes);
  const readinessScore = usePathStore((state) => state.readinessScore);
  const pathExplanation = usePathStore((state) => state.pathExplanation);
  const activePathPlan = usePathStore((state) => state.activePathPlan);

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
    <div className="fixed inset-0 z-[110] flex justify-end font-sans">
      {/* Backdrop */}
      <div 
        onClick={toggleTrustPanel}
        className="fixed inset-0 bg-aven-text/20 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Drawer Content */}
      <div className="relative w-80 md:w-[420px] bg-aven-base border-l border-aven-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-10 text-aven-text">
        
        {/* Header */}
        <div className="p-6 border-b border-aven-text-subtle flex justify-between items-center bg-aven-text-subtle">
          <div className="flex items-center gap-3 text-aven-base">
            <div className="w-10 h-10 rounded bg-aven-base text-aven-text-subtle flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <span className="uppercase tracking-tight font-black text-lg">Bayesian Readiness Vector</span>
          </div>
          <button 
            onClick={toggleTrustPanel}
            className="p-1.5 rounded text-aven-text-muted hover:text-aven-base hover:bg-aven-text-subtle transition-colors"
            title="Close Panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-7">
          
          {/* Goal Proximity Meter */}
          <div className="space-y-4">
            <div className="flex items-center justify-between font-bold uppercase tracking-widest text-aven-text">
              <span className="text-sm">Target Role Match</span>
              <span className="text-4xl tracking-tighter">{progressPercent}%</span>
            </div>
            <div className="w-full h-4 bg-aven-surface rounded-full overflow-hidden border border-aven-text-subtle">
              <div 
                className="h-full bg-aven-text-subtle transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-aven-text-subtle leading-relaxed font-medium">
              Calibrated across posterior mastery probabilities for <span className="font-bold text-aven-text">{targetRole}</span>.
            </p>
          </div>

          <div className="w-full h-px bg-aven-border" />

          {/* Explainability Trace */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-aven-text flex items-center gap-2">
              <Sparkles size={16} />
              <span>Grounded Decision Trace</span>
            </div>
            <div className="p-4 rounded-xl bg-aven-surface border border-aven-border text-sm text-aven-text leading-relaxed whitespace-pre-wrap font-medium">
              {pathExplanation || 
                (activePathPlan?.decision_trace?.explanation || 
                "PathFinder computes prerequisite paths deterministically through Neo4j topological sorting. Active focus is placed strictly on the nearest unmastered node to maximize velocity.")}
            </div>
          </div>

          {/* Time Budget Reality Check */}
          {activePathPlan?.decision_trace?.time_budget_warning && (
            <div className="p-4 rounded-xl bg-aven-base border border-aven-text text-aven-text text-sm space-y-2 shadow-sm">
              <div className="font-black flex items-center gap-2 uppercase tracking-widest text-xs">
                <AlertTriangle size={16} />
                Time Budget Warning
              </div>
              <p className="leading-relaxed font-bold">The projected time to complete this path ({activePathPlan.decision_trace.estimated_hours} hrs) exceeds your requested timeline. Consider negotiating scope or increasing weekly hours.</p>
            </div>
          )}

          <div className="w-full h-px bg-aven-border" />

          {/* Milestone Status Breakdown */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-aven-text flex items-center gap-2">
              <Activity size={16} />
              <span>Topological Pipeline</span>
            </div>
            <div className="space-y-3">
              {displayModules.map((mod, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    mod.status === 'completed'
                      ? 'bg-aven-surface border-aven-border text-aven-text-subtle'
                      : mod.status === 'active'
                      ? 'bg-aven-text-subtle border-aven-text-subtle text-aven-base font-bold shadow-lg shadow-black/10'
                      : 'bg-transparent border-aven-border text-aven-text-muted font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {mod.status === 'completed' && <CheckCircle2 size={18} className="shrink-0" />}
                    {mod.status === 'active' && <Sparkles size={18} className="shrink-0 text-aven-surface" />}
                    {mod.status === 'locked' && <Lock size={16} className="shrink-0 opacity-70" />}
                    <span className="truncate text-sm">{mod.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest shrink-0 ml-3 opacity-90">
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
