'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../../../store/usePathStore';
import ReadinessBar from '../../../components/learner/ReadinessBar';
import CurrentNodeCard from '../../../components/learner/CurrentNodeCard';
import AutonomySliders from '../../../components/learner/AutonomySliders';
import CareerAlternativesDrawer from '../../../components/learner/CareerAlternativesDrawer';
import MicroAssessmentModal from '../../../components/assessment/MicroAssessmentModal';
import { RefreshCw, Compass, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LearnerDashboard() {
  const [isPivotDrawerOpen, setIsPivotDrawerOpen] = useState(false);
  const [activeAssessmentSkill, setActiveAssessmentSkill] = useState<string | null>(null);

  const fetchActivePath = usePathStore((state) => state.fetchActivePath);
  const fetchReadiness = usePathStore((state) => state.fetchReadiness);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const readinessScore = usePathStore((state) => state.readinessScore);
  const targetRole = usePathStore((state) => state.targetRole);
  const isLoading = usePathStore((state) => state.isLoading);
  const pathError = usePathStore((state) => state.pathError);
  const nodes = usePathStore((state) => state.nodes);

  useEffect(() => {
    fetchActivePath();
    fetchReadiness();
  }, [fetchActivePath, fetchReadiness]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Readiness Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Target Role</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {targetRole}
          </h1>
        </div>
        <ReadinessBar percentage={readinessScore} />
      </div>

      {/* Error Recovery Banner */}
      {pathError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-rose-300 font-semibold">
            <AlertCircle size={16} />
            <span>{pathError}</span>
          </div>
          <button
            onClick={() => fetchActivePath()}
            className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* Main Grid: Active Milestone & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Active Learning Milestone */}
        <div className="lg:col-span-2 space-y-8">
          {isLoading && !activeMilestone ? (
            <div className="bg-surface border border-border rounded-2xl p-8 space-y-6 animate-pulse">
              <div className="h-6 bg-surface-secondary rounded-md w-1/3" />
              <div className="h-10 bg-surface-secondary rounded-lg w-3/4" />
              <div className="h-24 bg-surface-secondary rounded-xl w-full" />
              <div className="flex gap-4">
                <div className="h-10 bg-surface-secondary rounded-xl w-1/3" />
                <div className="h-10 bg-surface-secondary rounded-xl w-1/3" />
              </div>
            </div>
          ) : (
            <CurrentNodeCard 
              onStartAssessment={(skillId) => setActiveAssessmentSkill(skillId)}
            />
          )}

          {/* Quick Progress Summary */}
          {nodes.length > 0 && (() => {
            // Build a dynamic window: completed nodes + active + next 3 locked
            const completedNodes = nodes.filter(n => n.data?.status === 'completed');
            const activeNode = nodes.find(n => n.data?.status === 'active');
            const lockedNodes = nodes.filter(n => n.data?.status === 'locked');
            const displayNodes = [
              ...completedNodes,
              ...(activeNode ? [activeNode] : []),
              ...lockedNodes.slice(0, 3),
            ];
            return (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-glass">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={15} className="text-indigo-400" />
                  <span>Your Learning Path</span>
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {completedNodes.length}/{nodes.length} Mastered
                  </span>
                  <Link
                    href="/learner/graph"
                    className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Explore Full DAG</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayNodes.map((node, idx) => (
                  <div 
                    key={node.id} 
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      node.data?.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                        : node.data?.status === 'active'
                        ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 font-bold'
                        : 'bg-surface-secondary/40 border-border text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-surface-tertiary flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{node.data?.label as string || node.id}</span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold">
                      {node.data?.status === 'completed' ? '✓ Mastered' : node.data?.status === 'active' ? 'Active' : 'Locked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          {/* Autonomy Sliders */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-glass">
            <AutonomySliders />
          </div>

          {/* Pivot to Career Alternatives */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-glass flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-3">
              <RefreshCw className="text-indigo-400" size={20} />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Considering a Career Pivot?</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Salvage your mastered skills across 5 adjacent high-demand tech roles.
            </p>
            <button
              onClick={() => setIsPivotDrawerOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
            >
              <RefreshCw size={14} />
              <span>Explore Adjacent Roles</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      <CareerAlternativesDrawer 
        isOpen={isPivotDrawerOpen} 
        onClose={() => setIsPivotDrawerOpen(false)} 
      />

      {activeAssessmentSkill && (
        <MicroAssessmentModal 
          skillId={activeAssessmentSkill} 
          onClose={() => setActiveAssessmentSkill(null)} 
        />
      )}
    </div>
  );
}
