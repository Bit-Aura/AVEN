'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../../store/usePathStore';
import { simulateSkipDelta } from '../../api/client';
import { 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  TerminalSquare, 
  Bot, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface CurrentNodeCardProps {
  nodeName?: string;
  whyThisStep?: string;
  whatIfSkip?: string;
  onStartAssessment?: (skillId: string) => void;
}

export default function CurrentNodeCard({ 
  nodeName, 
  whyThisStep, 
  whatIfSkip,
  onStartAssessment 
}: CurrentNodeCardProps) {
  const [showWhy, setShowWhy] = useState(true);
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [projectedDate, setProjectedDate] = useState('Oct 28');
  const [deltaText, setDeltaText] = useState('+14 days friction');
  const [blockedNodes, setBlockedNodes] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const isSimulatingSkip = usePathStore((state) => state.isSimulatingSkip);
  const simulateSkip = usePathStore((state) => state.simulateSkip);
  const cancelSimulation = usePathStore((state) => state.cancelSimulation);
  const pathExplanation = usePathStore((state) => state.pathExplanation);
  const openIde = usePathStore((state) => state.openIde);
  const openCoach = usePathStore((state) => state.openCoach);
  const startAssessment = usePathStore((state) => state.startAssessment);
  const profileId = usePathStore((state) => state.profileId);

  const currentSkillId = activeMilestone?.id || nodeName || 'python_basics';
  const displayTitle = activeMilestone?.title || (nodeName ? nodeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Design RESTful APIs');
  const displayWhy = activeMilestone?.explanation || pathExplanation || whyThisStep || 'This is the immediate prerequisite needed before downstream service construction.';

  useEffect(() => {
    if (!isSimulatingSkip) return;

    setIsCalculating(true);
    const timer = setTimeout(async () => {
      try {
        const targetId = profileId || 1;
        const data = await simulateSkipDelta(targetId, currentSkillId, weeklyHours);
        setProjectedDate(data.projected_target_date || 'Nov 04');
        setDeltaText(`+${data.delta_days_calendar || 14} calendar days`);
        setBlockedNodes(data.blocked_descendants || []);
      } catch (e) {
        const daysAdded = Math.max(7, 21 - Math.floor(weeklyHours * 0.4));
        setProjectedDate('Nov 04');
        setDeltaText(`+${daysAdded} days`);
        setBlockedNodes(['FastAPI Backend', 'Async SQLAlchemy DB', 'API Gateway']);
      } finally {
        setIsCalculating(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [weeklyHours, isSimulatingSkip, currentSkillId, profileId]);

  const handleSimulateSkipToggle = () => {
    if (isSimulatingSkip) {
      cancelSimulation();
    } else {
      simulateSkip(currentSkillId, weeklyHours);
    }
  };

  const handleAssessmentTrigger = () => {
    if (onStartAssessment) {
      onStartAssessment(currentSkillId);
    } else {
      startAssessment();
    }
  };

  return (
    <div className={`bg-surface border rounded-2xl p-6 md:p-8 shadow-glass transition-all duration-300 relative overflow-hidden ${
      isSimulatingSkip ? 'border-amber-500/50 shadow-glow-rose' : 'border-border'
    }`}>
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Milestone Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Current Milestone</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {displayTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openIde(currentSkillId)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <TerminalSquare size={15} className="text-cyan-400" />
            <span>Sandbox IDE</span>
          </button>
          <button
            onClick={() => openCoach(currentSkillId)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-semibold transition-all shadow-glow-indigo"
          >
            <Bot size={15} />
            <span>Ask Coach</span>
          </button>
          <button
            onClick={handleAssessmentTrigger}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-glow-emerald"
          >
            <ShieldCheck size={15} />
            <span>Prove It</span>
          </button>
        </div>
      </div>

      {/* Decision Trace / Why This Step */}
      <div className="py-5 border-b border-border relative z-10">
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center justify-between w-full text-left group"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Sparkles size={16} className="text-indigo-400" />
            <span>Why this step is recommended</span>
          </div>
          {showWhy ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        
        {showWhy && (
          <div className="mt-3 p-4 rounded-xl bg-surface-secondary/70 border border-border text-xs md:text-sm text-slate-300 leading-relaxed animate-in fade-in duration-200">
            {displayWhy}
          </div>
        )}
      </div>

      {/* What If I Skip Simulation (Date-Delta Engine) */}
      <div className="pt-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleSimulateSkipToggle}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
              isSimulatingSkip 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-surface-secondary border-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle size={14} className={isSimulatingSkip ? 'text-amber-400 animate-pulse' : 'text-slate-400'} />
            <span>{isSimulatingSkip ? 'Exit Skip Simulation' : 'What If I Skip This?'}</span>
          </button>
          
          {isSimulatingSkip && (
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Live DAG Traversal Delta Active
            </span>
          )}
        </div>

        {isSimulatingSkip && (
          <div className="p-5 rounded-xl bg-surface-secondary border border-amber-500/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-400" />
                  <span>Projected Readiness Impact</span>
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Target date shifts to {projectedDate}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                    {deltaText}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400">Blocked Descendant Nodes</span>
                <span className="text-sm font-bold text-amber-400">{blockedNodes.length} skills affected</span>
              </div>
            </div>

            {/* Weekly Study Hours Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={13} /> Weekly Study Budget:
                </span>
                <span className="text-white font-bold">{weeklyHours} hours / week</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="40" 
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {blockedNodes.length > 0 && (
              <div className="pt-2 border-t border-border/80">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Downstream dependencies requiring this concept:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {blockedNodes.map((n, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-surface border border-rose-500/30 text-[11px] font-semibold text-rose-300">
                      {n.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
