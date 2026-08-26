'use client';

import { useState, useEffect } from 'react';
import { Briefcase, ArrowRight, X, Sparkles, RefreshCw, Loader2, TrendingUp, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';

export default function CareerAlternativesDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [selectedPivot, setSelectedPivot] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchSuccessRole, setSwitchSuccessRole] = useState<string | null>(null);

  const fetchCareerAlternatives = usePathStore(state => state.fetchCareerAlternatives);
  const switchTargetRole = usePathStore(state => state.switchTargetRole);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setSwitchSuccessRole(null);
      fetchCareerAlternatives()
        .then((res) => {
          if (res && res.alternatives && res.alternatives.length > 0) {
            // Map backend AlternativeRole fields to display format
            setAlternatives(res.alternatives.map((alt: any) => ({
              id: alt.role_id,
              role: alt.title,
              match: Math.round(alt.readiness_pct),
              salvagedSkills: alt.mastered_skills?.length || 0,
              totalSkills: (alt.mastered_skills?.length || 0) + (alt.missing_skills?.length || 0),
              masteredList: alt.mastered_skills || [],
              missingList: alt.missing_skills || [],
              description: alt.recommendation_badge || `Reuses ${alt.mastered_skills?.length || 0} of your mastered skills. ${alt.missing_skills?.length || 0} new skills to learn.`,
              badge: alt.recommendation_badge,
              weeksToReady: alt.estimated_weeks_to_ready,
              targetDate: alt.estimated_target_date,
              salary: alt.avg_salary_usd,
              growth: alt.job_growth_pct,
              isFastTrack: alt.is_fast_track,
            })));
          } else {
            setAlternatives([]);
          }
        })
        .catch(() => {
          setAlternatives([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, fetchCareerAlternatives]);

  const handleConfirmPivot = async () => {
    if (!selectedPivot || isSwitching) return;
    const selected = alternatives.find((a: any) => a.id === selectedPivot);
    setIsSwitching(true);
    try {
      await switchTargetRole(selectedPivot);
      setSwitchSuccessRole(selected ? selected.role : selectedPivot);
      setTimeout(() => {
        setIsSwitching(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error("Pivot switch failed:", e);
      setIsSwitching(false);
    }
  };

  if (!isOpen) return null;

  const selectedAlt = alternatives.find((a: any) => a.id === selectedPivot);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div className="relative w-full max-w-md h-full bg-surface border-l border-border shadow-glass flex flex-col animate-in slide-in-from-right duration-300 z-10">
        
        {/* Header */}
        <header className="p-6 border-b border-border flex justify-between items-center bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <RefreshCw className="text-brand-400" size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Career Pivot Analysis</h2>
              <p className="text-xs text-slate-400">Readiness computed from your BKT mastery scores</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-tertiary transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <div className="bg-brand-500/10 border border-brand-500/30 rounded-2xl p-4">
            <div className="flex gap-3">
              <Sparkles className="text-brand-400 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-slate-300 leading-relaxed">
                Your mastered skills are transferable. Below are adjacent tech roles ranked by weighted readiness from your actual assessment data.
              </p>
            </div>
          </div>

          {switchSuccessRole && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-300">Successfully Pivoted!</div>
                <div className="text-[11px] text-slate-300">Curriculum updated to {switchSuccessRole}.</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="animate-spin text-brand-400 mb-2" size={28} />
                <span className="text-xs">Computing weighted role readiness...</span>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Briefcase className="text-slate-500 mb-2" size={28} />
                <span className="text-xs">No career alternatives computed yet. Complete some skill assessments first.</span>
              </div>
            ) : (
              alternatives.map((alt) => (
                <div 
                  key={alt.id}
                  onClick={() => setSelectedPivot(alt.id)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all duration-200 space-y-3 ${
                    selectedPivot === alt.id 
                      ? 'bg-surface-secondary border-brand-500 shadow-glow-indigo' 
                      : 'bg-surface border-border hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Briefcase size={15} className="text-brand-400" />
                      <span>{alt.role}</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      alt.match >= 70
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : alt.match >= 40
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}>
                      {alt.match}% Ready
                    </span>
                  </div>

                  {/* Badge */}
                  {alt.badge && (
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg inline-block ${
                      alt.isFastTrack
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                    }`}>
                      {alt.badge}
                    </div>
                  )}
                  
                  {/* Stats row */}
                  <div className="flex gap-3 text-[10px] text-slate-400">
                    {alt.salary && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={10} />
                        ${(alt.salary / 1000).toFixed(0)}k avg
                      </span>
                    )}
                    {alt.growth && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <TrendingUp size={10} />
                        +{alt.growth}% growth
                      </span>
                    )}
                    {alt.weeksToReady !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        ~{alt.weeksToReady} weeks
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-300">
                      <span className="text-slate-400">Skills Salvaged:</span>
                      <span className="font-bold text-white">{alt.salvagedSkills} / {alt.totalSkills}</span>
                    </div>
                    
                    {/* Visual Comparison Bar */}
                    <div className="h-1.5 w-full bg-surface-secondary rounded-full overflow-hidden flex border border-border">
                      <div 
                        className="h-full bg-brand-500"
                        style={{ width: `${alt.totalSkills > 0 ? (alt.salvagedSkills / alt.totalSkills) * 100 : 0}%` }}
                      />
                      <div 
                        className="h-full bg-surface-tertiary"
                        style={{ width: `${alt.totalSkills > 0 ? 100 - ((alt.salvagedSkills / alt.totalSkills) * 100) : 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-5 border-t border-border bg-surface-secondary/40 space-y-2">
          {selectedAlt && (
            <div className="text-[11px] text-slate-400 flex justify-between px-1">
              <span>Target: <strong className="text-white">{selectedAlt.role}</strong></span>
              <span>Missing: <strong className="text-amber-400">{selectedAlt.missingList.length} skills</strong></span>
            </div>
          )}
          <button 
            disabled={!selectedPivot || isSwitching}
            onClick={handleConfirmPivot}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-3 rounded-xl shadow-glow-indigo transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSwitching ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Pivoting Target Curriculum...</span>
              </>
            ) : (
              <>
                <span>Switch to {selectedAlt ? selectedAlt.role : 'Selected Role'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
