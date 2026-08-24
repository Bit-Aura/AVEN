'use client';

import { useState, useEffect } from 'react';
import { Briefcase, ArrowRight, X, Sparkles, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';

const FALLBACK_ALTERNATIVES = [
  {
    id: "data_engineer",
    role: "Data & Analytics Engineer",
    match: 78,
    salvagedSkills: 8,
    totalSkills: 11,
    description: "Reuses your Python, SQL, and database indexing expertise. Focuses on data pipelines and warehouse architecture."
  },
  {
    id: "devops_sre",
    role: "DevOps / SRE Engineer",
    match: 70,
    salvagedSkills: 7,
    totalSkills: 10,
    description: "Builds on Linux fundamentals, Docker, and REST APIs. Focuses on CI/CD pipelines and infrastructure monitoring."
  },
  {
    id: "fullstack_dev",
    role: "Full-Stack Software Engineer",
    match: 85,
    salvagedSkills: 9,
    totalSkills: 12,
    description: "Reuses your backend FastAPI & DB architecture skills, pairing with modern React/Next.js frontend design."
  },
];

export default function CareerAlternativesDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [selectedPivot, setSelectedPivot] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchCareerAlternatives = usePathStore(state => state.fetchCareerAlternatives);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchCareerAlternatives()
        .then((res) => {
          if (res && res.alternatives && res.alternatives.length > 0) {
            setAlternatives(res.alternatives.map((alt: any) => ({
              id: alt.role_id,
              role: alt.role_title,
              match: Math.round(alt.match_score * 100),
              salvagedSkills: alt.salvaged_skills_count,
              totalSkills: alt.total_skills_count,
              description: alt.pivot_recommendation || 'Consider this alternative adjacent career path.'
            })));
          } else {
            setAlternatives(FALLBACK_ALTERNATIVES);
          }
        })
        .catch(() => {
          setAlternatives(FALLBACK_ALTERNATIVES);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, fetchCareerAlternatives]);

  if (!isOpen) return null;

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
              <h2 className="text-base font-bold text-white">Considering a Career Pivot?</h2>
              <p className="text-xs text-slate-400">Salvage your mastered competencies across adjacent roles</p>
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
                Your mastered skills are transferable. Below are adjacent tech roles with high skill graph overlap.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="animate-spin text-brand-400 mb-2" size={28} />
                <span className="text-xs">Computing topological skill overlap...</span>
              </div>
            ) : (
              alternatives.map((alt) => (
                <div 
                  key={alt.id}
                  onClick={() => setSelectedPivot(alt.id)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all duration-200 space-y-2.5 ${
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
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      {alt.match}% Match
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed">{alt.description}</p>
                  
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-300">
                      <span className="text-slate-400">Skills Salvaged:</span>
                      <span className="font-bold text-white">{alt.salvagedSkills} / {alt.totalSkills}</span>
                    </div>
                    
                    {/* Visual Comparison Bar */}
                    <div className="h-1.5 w-full bg-surface-secondary rounded-full overflow-hidden flex border border-border">
                      <div 
                        className="h-full bg-brand-500"
                        style={{ width: `${(alt.salvagedSkills / alt.totalSkills) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-surface-tertiary"
                        style={{ width: `${100 - ((alt.salvagedSkills / alt.totalSkills) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-5 border-t border-border bg-surface-secondary/40">
          <button 
            disabled={!selectedPivot}
            onClick={() => {
              alert(`Switching target curriculum to ${selectedPivot}`);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-3 rounded-xl shadow-glow-indigo transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Preview Pivot Curriculum</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
