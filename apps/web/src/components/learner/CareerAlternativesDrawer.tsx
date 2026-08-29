'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, ArrowRight, X, Sparkles, RefreshCw, Loader2, TrendingUp, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';

/**
 * Enterprise-grade implementation of CareerAlternativesDrawer.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function CareerAlternativesDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [selectedPivot, setSelectedPivot] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchSuccessRole, setSwitchSuccessRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchCareerAlternatives = usePathStore(state => state.fetchCareerAlternatives);
  const switchTargetRole = usePathStore(state => state.switchTargetRole);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const selectedAlt = alternatives.find((a: any) => a.id === selectedPivot);

  const drawerContent = (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-aven-text/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div className="relative w-full max-w-md h-full bg-aven-base border-l border-aven-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10 text-aven-text">
        
        {/* Header */}
        <header className="p-6 border-b border-aven-text-subtle flex justify-between items-center bg-aven-text-subtle">
          <div className="flex items-center gap-3 text-aven-base">
            <div className="w-10 h-10 rounded bg-aven-base text-aven-text-subtle flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
            <div>
              <h2 className="uppercase tracking-tight font-black text-lg">Career Pivot Analysis</h2>
              <p className="text-xs text-aven-base/80 font-medium">Readiness computed from your BKT mastery scores</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded text-aven-text-muted hover:text-aven-base hover:bg-aven-text transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-7">
          <div className="bg-aven-surface border border-aven-border rounded-xl p-4">
            <div className="flex gap-3">
              <Sparkles className="text-aven-text shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium text-aven-text-subtle leading-relaxed">
                Your mastered skills are transferable. Below are adjacent tech roles ranked by weighted readiness from your actual assessment data.
              </p>
            </div>
          </div>

          {switchSuccessRole && (
            <div className="bg-aven-text border border-aven-text text-aven-base rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 size={20} className="shrink-0" />
              <div>
                <div className="text-sm font-bold uppercase tracking-widest">Successfully Pivoted!</div>
                <div className="text-xs font-medium">Curriculum updated to {switchSuccessRole}.</div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-aven-text-muted">
                <Loader2 className="animate-spin text-aven-text mb-2" size={28} />
                <span className="text-xs font-bold uppercase tracking-widest text-aven-text">Computing readiness...</span>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-aven-text-muted">
                <Briefcase className="text-aven-text-subtle mb-2" size={28} />
                <span className="text-xs font-bold uppercase tracking-widest text-aven-text text-center">No career alternatives computed yet.<br/>Complete some skill assessments first.</span>
              </div>
            ) : (
              alternatives.map((alt) => (
                <div 
                  key={alt.id}
                  onClick={() => setSelectedPivot(alt.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 space-y-4 flex flex-col ${
                    selectedPivot === alt.id 
                      ? 'bg-aven-surface border-aven-text/40 shadow-sm' 
                      : 'bg-aven-base border-aven-text/20 hover:border-aven-text/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-aven-text flex items-center gap-2">
                      <Briefcase size={16} className={selectedPivot === alt.id ? "text-aven-text" : "text-aven-text-subtle"} />
                      <span>{alt.role}</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${
                      alt.match >= 70
                        ? 'bg-aven-text text-aven-base border-aven-text'
                        : alt.match >= 40
                        ? 'bg-aven-text-subtle text-aven-base border-aven-text-subtle'
                        : 'bg-aven-surface text-aven-text border-aven-border'
                    }`}>
                      {alt.match}% Ready
                    </span>
                  </div>

                  {/* Badge */}
                  {alt.badge && (
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-md inline-block uppercase tracking-wider ${
                      alt.isFastTrack
                        ? 'bg-aven-surface text-aven-text border border-aven-border'
                        : 'bg-aven-base text-aven-text-subtle border border-aven-border'
                    }`}>
                      {alt.badge}
                    </div>
                  )}
                  
                  {/* Stats row */}
                  <div className="flex gap-3 text-xs font-medium text-aven-text-subtle">
                    {alt.salary && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} />
                        ${(alt.salary / 1000).toFixed(0)}k avg
                      </span>
                    )}
                    {alt.growth && (
                      <span className="flex items-center gap-1 font-bold text-aven-text">
                        <TrendingUp size={12} />
                        +{alt.growth}% growth
                      </span>
                    )}
                    {alt.weeksToReady !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        ~{alt.weeksToReady} weeks
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mt-2 pt-3 border-t border-aven-border">
                    <div className="flex justify-between text-xs font-bold text-aven-text">
                      <span>Skills Salvaged:</span>
                      <span>{alt.salvagedSkills} / {alt.totalSkills}</span>
                    </div>
                    
                    {/* Visual Comparison Bar */}
                    <div className="h-2 w-full bg-aven-surface rounded-full overflow-hidden flex border border-aven-border">
                      <div 
                        className="h-full bg-aven-text"
                        style={{ width: `${alt.totalSkills > 0 ? (alt.salvagedSkills / alt.totalSkills) * 100 : 0}%` }}
                      />
                      <div 
                        className="h-full bg-transparent"
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
        <div className="p-6 border-t border-aven-border bg-aven-surface space-y-3">
          {selectedAlt && (
            <div className="text-xs font-bold text-aven-text-subtle flex justify-between px-1">
              <span>Target: <span className="text-aven-text">{selectedAlt.role}</span></span>
              <span>Missing: <span className="text-aven-text">{selectedAlt.missingList.length} skills</span></span>
            </div>
          )}
          <button 
            disabled={!selectedPivot || isSwitching}
            onClick={handleConfirmPivot}
            className="w-full flex items-center justify-center gap-2 bg-aven-text-subtle hover:bg-aven-text text-aven-base font-bold text-xs py-3.5 rounded-xl border border-aven-text transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-md"
          >
            {isSwitching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Pivoting Target Curriculum...</span>
              </>
            ) : (
              <>
                <span>Switch to {selectedAlt ? selectedAlt.role : 'Selected Role'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
