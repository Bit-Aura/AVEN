'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fire, 
  Clock, 
  WarningCircle, 
  Buildings, 
  CalendarBlank, 
  Spinner, 
  CheckCircle,
  ListChecks,
  PlayCircle,
  BookOpenText,
  CodeBlock,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { usePathStore } from '../../../store/usePathStore';
import { generatePlacementPlan } from '../../../api/client';
import ProveItAssessment from '../../../components/ProveItAssessment';

const bentoVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

export default function PlacementJourney() {
  const profileId = usePathStore((state) => state.profileId);
  const [selectedCompany, setSelectedCompany] = useState('google');
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState(
    new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBreakAcknowledged, setIsBreakAcknowledged] = useState(false);

  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<string | null>(null);
  const [expandedSprint, setExpandedSprint] = useState<number | null>(0);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  const activeId = profileId || 1;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('target');
    const role = params.get('role');

    if (role) setTargetRole(role);

    import('../../../api/client').then(({ fetchPlacementCompanies }) => {
      fetchPlacementCompanies().then(comps => {
        setCompanies(comps);
        
        if (target) {
          // Deep-linked from Market Radar: immediately set and generate
          setSelectedCompany(target);
          loadPlacementPlan(target, interviewDate);
          // Clean the URL so refresh doesn't re-trigger unintentionally
          window.history.replaceState({}, '', '/war-room');
        } else {
          // Standard load
          const defaultComp = comps.length > 0 ? comps[0].name : 'google';
          if (!selectedCompany) setSelectedCompany(defaultComp);
          if (!plan && !isLoading) loadPlacementPlan(defaultComp, interviewDate);
        }
      }).catch(e => console.error("Failed to load companies", e));
    });
  }, []);

  const loadPlacementPlan = async (compId: string, dateStr: string) => {
    if (!compId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await generatePlacementPlan({
        profile_id: activeId,
        company_id: compId,
        drive_date: dateStr
      });
      setPlan(res);
      setExpandedSprint(0); // auto-expand first sprint
      setCompletedTaskIds(new Set()); // reset progress on new plan
    } catch (e: any) {
      console.error("Placement plan failed", e);
      setErrorMsg(e.message || "Failed to generate placement plan");
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && !plan && !isLoading) {
      loadPlacementPlan(selectedCompany, interviewDate);
    }
  }, []);

  const calculateDaysRemaining = () => {
    if (plan?.days_remaining) return plan.days_remaining;
    const diff = new Date(interviewDate).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = calculateDaysRemaining();
  const isFeasible = plan ? plan.is_feasible : true;
  const sprints = plan?.sprint_weeks || plan?.sprints || [];
  
  // Gamification: Reduce stress index as they complete tasks
  const totalTasks = sprints.reduce((acc: number, s: any) => acc + (s.tasks?.length || 0), 0);
  const completionRatio = totalTasks > 0 ? completedTaskIds.size / totalTasks : 0;
  const baseBurnoutRisk = plan?.stress_index_pct || 0;
  const burnoutRisk = Math.max(0, Math.round(baseBurnoutRisk * (1 - completionRatio)));

  return (
    <div className="max-w-[1400px] mx-auto pb-12">
      {/* 4. HIERARCHY & ALIGNMENT: Strict header alignment acting as the anchor point */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Fire weight="duotone" className="text-brand-400" size={20} />
            <span className="text-xs font-bold tracking-widest uppercase text-brand-300">Focus Path</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Your Placement Journey
          </h1>
        </div>

        {/* Action Bar (Contrast & Alignment) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-surface/80 border border-border/80 px-4 py-2.5 rounded-2xl">
            <Buildings weight="duotone" size={20} className="text-indigo-400" />
            <input
              type="text"
              list="company-list"
              value={selectedCompany}
              placeholder="e.g. Stripe, OpenAI, Google..."
              onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                    loadPlacementPlan(selectedCompany, interviewDate);
                 }
              }}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent text-sm font-medium text-white focus:outline-none placeholder:text-slate-500 w-40"
            />
            <datalist id="company-list">
              {companies.map((comp) => (
                <option key={comp.id} value={comp.name} />
              ))}
            </datalist>
          </div>
          
          <div className="flex items-center gap-3 bg-surface/80 border border-border/80 px-4 py-2.5 rounded-2xl">
            <CalendarBlank weight="duotone" size={20} className="text-brand-400" />
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => {
                setInterviewDate(e.target.value);
                loadPlacementPlan(selectedCompany, e.target.value);
              }}
              className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => loadPlacementPlan(selectedCompany, interviewDate)}
            disabled={isLoading}
            className="bg-white text-slate-950 hover:bg-slate-200 text-sm font-bold px-6 py-2.5 rounded-2xl transition-colors flex items-center gap-2 shadow-md"
          >
            {isLoading ? <Spinner weight="bold" size={18} className="animate-spin" /> : <Fire weight="bold" size={18} />}
            Generate Path
          </motion.button>
        </div>
      </motion.div>

      {/* 2. WHITE SPACE & BALANCE: Bento Grid Layout */}
      {/* 6. BALANCE: Asymmetrical grid (8 cols vs 4 cols) ensures a stable, dense layout without endless scrolling */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse"
          >
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-surface/40 border border-border/40 rounded-3xl h-40"></div>
              <div className="bg-surface/40 border border-border/40 rounded-3xl h-96"></div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface/40 border border-border/40 rounded-3xl h-56"></div>
              <div className="bg-surface/40 border border-border/40 rounded-3xl h-80"></div>
            </div>
          </motion.div>
        )}

        {!isLoading && errorMsg && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center bg-rose-950/20 border border-rose-500/20 rounded-3xl"
          >
            <WarningCircle weight="duotone" className="text-rose-400 mx-auto mb-3" size={40} />
            <h3 className="text-lg font-semibold text-rose-200 mb-1">We couldn't map this path</h3>
            <p className="text-rose-400/80 text-sm max-w-sm mx-auto">{errorMsg}</p>
          </motion.div>
        )}

        {!isLoading && !errorMsg && plan && (
          <motion.div 
            key="content"
            variants={bentoVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* 1. EMPHASIS: Massive Countdown Card */}
            <motion.div variants={itemVariants} className="lg:col-span-8 bg-gradient-to-br from-surface to-surface-secondary border border-border/60 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-1 relative z-10">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Clock weight="fill" size={16} className="text-brand-400" />
                  <span>Countdown to {plan?.company_name || companies.find(c => c.id === selectedCompany)?.name}</span>
                </div>
                {/* 3. CONTRAST: Massive white number against dark bg */}
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-semibold text-white tracking-tighter">
                    {daysRemaining}
                  </span>
                  <span className="text-lg font-medium text-slate-500">
                    Days
                  </span>
                </div>
                {targetRole && (
                  <div className="mt-2 text-sm font-semibold text-brand-300 bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-lg inline-block">
                    Target: {targetRole}
                  </div>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-md relative z-10 w-full md:w-auto text-center md:text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Target Pace</div>
                <div className="text-2xl font-medium text-white">
                  {plan?.weekly_study_hours || 14} <span className="text-sm text-slate-500">hrs/week</span>
                </div>
                <div className={`text-xs font-bold mt-2 flex items-center justify-center md:justify-start gap-1.5 ${isFeasible ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isFeasible ? <CheckCircle weight="fill" /> : <WarningCircle weight="fill" />}
                  {isFeasible ? 'Comfortable Timeline' : 'Aggressive Pace Needed'}
                </div>
              </div>
            </motion.div>

            {/* Pacing & Energy Card */}
            <motion.div variants={itemVariants} className={`lg:col-span-4 p-8 rounded-3xl border space-y-5 flex flex-col justify-center ${
              burnoutRisk > 70 
                ? 'bg-rose-950/20 border-rose-500/20'
                : 'bg-surface border-border/60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WarningCircle weight="duotone" size={18} className={burnoutRisk > 70 ? 'text-rose-400' : 'text-slate-400'} />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Pacing & Energy</span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${
                  burnoutRisk > 70 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {burnoutRisk > 70 ? 'High Friction' : 'Great Momentum'}
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-3xl font-semibold text-white">{burnoutRisk}%</span>
                  <span className="text-xs text-slate-500 font-medium">Stress Index</span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, burnoutRisk)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${
                      burnoutRisk > 70 ? 'bg-gradient-to-r from-amber-400 to-rose-500' : 'bg-emerald-400'
                    }`}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {burnoutRisk > 70 && !isBreakAcknowledged ? (
                  <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setIsBreakAcknowledged(true)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-200 font-medium text-xs transition-colors"
                  >
                    Schedule 24h Rest
                  </motion.button>
                ) : isBreakAcknowledged ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-2.5 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 font-medium"
                  >
                    <CheckCircle weight="fill" size={16} />
                    <span>Rest scheduled. Keep it up!</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>

            {/* 5. HIERARCHY: Sprints timeline below emphasis */}
            <motion.div variants={itemVariants} className="lg:col-span-8 bg-surface border border-border/60 rounded-3xl p-8">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-6">
                <ListChecks weight="fill" size={16} className="text-indigo-400" />
                <span>Your Milestones ({sprints.length} Weeks)</span>
              </div>
              
              <div className="space-y-3">
                {/* 7. REPETITION: Consistent use of rounded-2xl for all inner bento items */}
                {sprints.map((sprint: any, idx: number) => {
                  const isExpanded = expandedSprint === idx;
                  return (
                    <motion.div 
                      key={idx}
                      layout
                      onClick={() => setExpandedSprint(isExpanded ? null : idx)}
                      className={`group cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isExpanded ? 'bg-surface-secondary/80 border-brand-500/40 shadow-sm' : 
                        sprint.is_crunch_week ? 'bg-rose-950/10 border-rose-500/30' : 'bg-black/20 border-border/40 hover:border-border/80'
                      }`}
                    >
                      <motion.div layout className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-colors ${
                            isExpanded ? 'bg-brand-500 text-white' : 'bg-surface border border-border text-slate-400 group-hover:text-white group-hover:border-slate-600'
                          }`}>
                            {sprint.week_number}
                          </div>
                          <span className={`text-sm font-semibold transition-colors ${isExpanded ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                            {sprint.week_label || `Week ${sprint.week_number}`}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                          sprint.is_crunch_week ? 'bg-rose-500/20 text-rose-300' : 'bg-surface border border-border/50 text-slate-400'
                        }`}>
                          {sprint.focus_area}
                        </span>
                      </motion.div>

                      <AnimatePresence>
                        {isExpanded && sprint.tasks && sprint.tasks.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4 pt-0 space-y-2"
                          >
                            <div className="w-full h-px bg-border/40 mb-3 ml-12 max-w-[calc(100%-3rem)]" />
                            {sprint.tasks.map((task: any, tIdx: number) => {
                              const isAssessment = task.action_type === 'assessment';
                              const isResource = task.action_type === 'resource';
                              const isMock = task.action_type === 'mock_interview';
                              
                              if (task.action_type === 'info' || typeof task === 'string') {
                                const title = typeof task === 'string' ? task : task.title;
                                return (
                                  <div key={tIdx} className="text-xs font-medium text-slate-400 flex items-start gap-3 pl-12 py-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 shrink-0" />
                                    <span className="leading-relaxed">{title}</span>
                                  </div>
                                );
                              }

                              const isCompleted = completedTaskIds.has(task.action_payload || task.title);

                              return (
                                <motion.button 
                                  whileHover={!isCompleted ? { scale: 1.005, x: 2 } : {}}
                                  whileTap={!isCompleted ? { scale: 0.99 } : {}}
                                  key={tIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAssessment && !isCompleted) setActiveAssessment(task.action_payload);
                                  }}
                                  className={`w-full text-left text-xs flex items-center justify-between p-3 rounded-xl ml-12 max-w-[calc(100%-3rem)] transition-colors ${
                                    isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 opacity-70' :
                                    isAssessment ? 'bg-brand-500/10 hover:bg-brand-500/20 text-brand-100 border border-brand-500/20' :
                                    isMock ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-100 border border-rose-500/20' :
                                    'bg-surface hover:bg-surface-secondary text-slate-300 border border-transparent hover:border-border/50'
                                  }`}
                                >
                                  <span className="flex items-center gap-3">
                                    {isCompleted ? <CheckCircle weight="fill" size={16} className="text-emerald-400" /> : (
                                      <>
                                        {isAssessment && <PlayCircle weight="fill" size={16} className="text-brand-400" />}
                                        {isResource && <BookOpenText weight="duotone" size={16} className="text-indigo-400" />}
                                        {isMock && <CodeBlock weight="duotone" size={16} className="text-rose-400" />}
                                      </>
                                    )}
                                    <span className={`font-semibold ${isCompleted ? 'line-through text-emerald-500/70' : ''}`}>{task.title}</span>
                                  </span>
                                  {isCompleted ? (
                                    <span className="text-[9px] uppercase tracking-widest font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">Done</span>
                                  ) : (
                                    isAssessment && <span className="text-[9px] uppercase tracking-widest font-bold bg-brand-500 text-white px-2 py-0.5 rounded-md shadow-sm">Challenge</span>
                                  )}
                                </motion.button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Opportunities Horizon Card */}
            {plan?.market_signals && plan.market_signals.length > 0 && (
              <motion.div variants={itemVariants} className="lg:col-span-4 p-8 rounded-3xl bg-surface border border-border/60 flex flex-col max-h-[600px]">
                <div className="flex items-center gap-2 mb-6">
                  <Fire weight="fill" size={16} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Market Signals</span>
                </div>
                
                <p className="text-xs font-medium text-slate-400 leading-relaxed mb-4">
                  Tailored based on {plan.market_signals.length} active roles currently open at {plan.company_name}.
                </p>
                
                {/* 5. WHITE SPACE: Using internal scroll with fading edges to maintain compact bento structure */}
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {plan.market_signals.map((signal: any, idx: number) => (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      key={idx} 
                      className="group p-4 bg-black/20 hover:bg-surface-secondary border border-border/40 hover:border-border rounded-2xl transition-colors relative"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="text-sm font-semibold text-slate-200 leading-tight group-hover:text-white transition-colors">
                          {signal.job_title}
                        </div>
                        {signal.url && (
                          <a 
                            href={signal.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-slate-500 hover:text-brand-400 bg-surface border border-border/50 hover:border-brand-500/30 p-1.5 rounded-lg transition-all flex-shrink-0 shadow-sm"
                            title="View full job posting"
                          >
                            <ArrowSquareOut weight="bold" size={14} />
                          </a>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {signal.extracted_skills.map((skill: string, sIdx: number) => (
                          <span 
                            key={sIdx} 
                            className="text-[10px] font-bold tracking-wide uppercase text-slate-400 bg-surface border border-border/40 px-2 py-0.5 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeAssessment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-3xl relative shadow-2xl"
            >
              <button 
                onClick={() => setActiveAssessment(null)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-surface-secondary text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
              >
                ✕
              </button>
              <ProveItAssessment 
                milestoneId={activeAssessment} 
                onComplete={() => {
                  setCompletedTaskIds(prev => new Set(prev).add(activeAssessment));
                  setActiveAssessment(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
