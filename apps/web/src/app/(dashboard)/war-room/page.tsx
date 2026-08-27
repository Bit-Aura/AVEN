'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Clock, 
  AlertCircle, 
  Building2, 
  Calendar, 
  Loader2, 
  CheckCircle2,
  ListChecks,
  PlayCircle,
  BookOpen,
  Code2,
  ExternalLink
} from 'lucide-react';
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
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 25 } }
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
    <div className="max-w-[1400px] mx-auto pb-12 font-sans">
      {/* 4. HIERARCHY & ALIGNMENT: Strict header alignment acting as the anchor point */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 pb-6 border-b border-[#141413]/10"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="text-[#141413]" size={18} />
            <span className="text-xs font-bold tracking-widest uppercase text-[#3d3d3a]">Focus Path</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#141413] tracking-tight">
            Your Placement Journey
          </h1>
        </div>

        {/* Action Bar (Contrast & Alignment) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-[#faf9f5] border border-[#141413]/20 focus-within:border-[#141413] px-4 py-2.5 rounded-2xl transition-colors">
            <Building2 size={20} className="text-[#141413]" />
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
              className="bg-transparent text-sm font-medium text-[#141413] focus:outline-none placeholder:text-[#3d3d3a]/50 w-40 tracking-wide"
            />
            <datalist id="company-list">
              {companies.map((comp) => (
                <option key={comp.id} value={comp.name} />
              ))}
            </datalist>
          </div>
          
          <div className="flex items-center gap-3 bg-[#faf9f5] border border-[#141413]/20 focus-within:border-[#141413] px-4 py-2.5 rounded-2xl transition-colors">
            <Calendar size={20} className="text-[#141413]" />
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => {
                setInterviewDate(e.target.value);
                loadPlacementPlan(selectedCompany, e.target.value);
              }}
              className="bg-transparent text-sm font-medium text-[#141413] focus:outline-none cursor-pointer tracking-wide"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => loadPlacementPlan(selectedCompany, interviewDate)}
            disabled={isLoading}
            className="bg-[#141413] text-[#faf9f5] hover:bg-[#3d3d3a] text-sm font-bold px-6 py-2.5 rounded-2xl transition-colors flex items-center gap-2 border border-[#141413] shadow-sm disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
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
              <div className="bg-[#e8e6dc] border border-[#141413]/10 h-40 rounded-3xl"></div>
              <div className="bg-[#e8e6dc] border border-[#141413]/10 h-96 rounded-3xl"></div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#e8e6dc] border border-[#141413]/10 h-56 rounded-3xl"></div>
              <div className="bg-[#e8e6dc] border border-[#141413]/10 h-80 rounded-3xl"></div>
            </div>
          </motion.div>
        )}

        {!isLoading && errorMsg && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center bg-[#141413] border border-[#141413] rounded-3xl"
          >
            <AlertCircle className="text-[#faf9f5] mx-auto mb-3" size={40} />
            <h3 className="text-lg font-bold text-[#faf9f5] mb-1">We couldn't map this path</h3>
            <p className="text-[#e8e6dc] text-sm max-w-sm mx-auto font-medium">{errorMsg}</p>
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
            <motion.div variants={itemVariants} className="lg:col-span-8 bg-[#faf9f5] border border-[#141413]/10 p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-sm">
              <div className="space-y-1 relative z-10">
                <div className="text-xs font-bold uppercase tracking-widest text-[#3d3d3a] flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-[#141413]" />
                  <span>Countdown to {plan?.company_name || companies.find(c => c.id === selectedCompany)?.name}</span>
                </div>
                {/* 3. CONTRAST: Massive high-contrast number */}
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-semibold text-[#141413] tracking-tighter">
                    {daysRemaining}
                  </span>
                  <span className="text-lg font-medium text-[#3d3d3a]">
                    Days
                  </span>
                </div>
                {targetRole && (
                  <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#141413] bg-[#e8e6dc] border border-[#141413]/10 px-3 py-1.5 inline-block rounded-lg">
                    Target: {targetRole}
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#e8e6dc] border border-[#141413]/10 rounded-2xl relative z-10 w-full md:w-auto text-center md:text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-[#3d3d3a] mb-2">Target Pace</div>
                <div className="text-2xl font-semibold text-[#141413]">
                  {plan?.weekly_study_hours || 14} <span className="text-sm text-[#3d3d3a]">hrs/week</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-4 flex items-center justify-center md:justify-start gap-1.5 text-[#141413]">
                  {isFeasible ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {isFeasible ? 'Comfortable Timeline' : 'Aggressive Pace Needed'}
                </div>
              </div>
            </motion.div>

            {/* Pacing & Energy Card */}
            <motion.div variants={itemVariants} className={`lg:col-span-4 p-8 border rounded-3xl space-y-6 flex flex-col justify-center shadow-sm ${
              burnoutRisk > 70 
                ? 'bg-[#141413] border-[#141413]'
                : 'bg-[#faf9f5] border-[#141413]/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className={burnoutRisk > 70 ? 'text-[#faf9f5]' : 'text-[#141413]'} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${burnoutRisk > 70 ? 'text-[#faf9f5]' : 'text-[#3d3d3a]'}`}>Pacing & Energy</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border rounded-lg ${
                  burnoutRisk > 70 ? 'bg-[#faf9f5] text-[#141413] border-[#faf9f5]' : 'bg-[#e8e6dc] text-[#141413] border-[#141413]/10'
                }`}>
                  {burnoutRisk > 70 ? 'High Friction' : 'Great Momentum'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-semibold ${burnoutRisk > 70 ? 'text-[#faf9f5]' : 'text-[#141413]'}`}>{burnoutRisk}%</span>
                  <span className={`text-xs font-medium pb-1 ${burnoutRisk > 70 ? 'text-[#e8e6dc]' : 'text-[#3d3d3a]'}`}>Stress Index</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden border ${burnoutRisk > 70 ? 'bg-[#3d3d3a] border-[#faf9f5]/20' : 'bg-[#e8e6dc] border-[#141413]/10'}`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, burnoutRisk)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${
                      burnoutRisk > 70 ? 'bg-[#faf9f5]' : 'bg-[#141413]'
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
                    className="w-full py-3 px-4 rounded-2xl bg-[#faf9f5] hover:bg-[#e8e6dc] border border-[#faf9f5] text-[#141413] font-medium text-sm transition-colors shadow-sm"
                  >
                    Schedule 24h Rest
                  </motion.button>
                ) : isBreakAcknowledged ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-3 px-4 rounded-2xl bg-[#e8e6dc] border border-[#141413]/10 text-xs text-[#141413] flex items-center justify-center gap-2 font-medium shadow-sm"
                  >
                    <CheckCircle2 size={16} />
                    <span>Rest scheduled. Keep it up!</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>

            {/* 5. HIERARCHY: Sprints timeline below emphasis */}
            <motion.div variants={itemVariants} className="lg:col-span-8 bg-[#faf9f5] border border-[#141413]/10 p-8 rounded-3xl shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#3d3d3a] flex items-center gap-2 mb-6">
                <ListChecks size={16} className="text-[#141413]" />
                <span>Your Milestones ({sprints.length} Weeks)</span>
              </div>
              
              <div className="space-y-4">
                {/* 7. REPETITION: Consistent use of brutalist boxes for all inner bento items */}
                {sprints.map((sprint: any, idx: number) => {
                  const isExpanded = expandedSprint === idx;
                  return (
                    <motion.div 
                      key={idx}
                      layout
                      onClick={() => setExpandedSprint(isExpanded ? null : idx)}
                      className={`group cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isExpanded ? 'bg-[#e8e6dc] border-[#141413]' : 
                        sprint.is_crunch_week ? 'bg-[#faf9f5] border-[#141413] border-2 shadow-sm' : 'bg-[#faf9f5] border-[#141413]/10 hover:border-[#141413]'
                      }`}
                    >
                      <motion.div layout className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full font-black text-[11px] flex items-center justify-center border transition-colors ${
                            isExpanded ? 'bg-[#141413] text-[#faf9f5] border-[#141413]' : 
                            sprint.is_crunch_week ? 'bg-[#141413] text-[#faf9f5] border-[#141413]' :
                            'bg-[#e8e6dc] border-[#141413]/10 text-[#141413] group-hover:bg-[#141413] group-hover:text-[#faf9f5] group-hover:border-[#141413]'
                          }`}>
                            {sprint.week_number}
                          </div>
                          <span className={`text-[13px] font-black uppercase tracking-wide transition-colors ${
                            isExpanded ? 'text-[#141413]' : 
                            sprint.is_crunch_week ? 'text-[#141413]' :
                            'text-[#141413]'
                          }`}>
                            {sprint.week_label || `Week ${sprint.week_number}`}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                          sprint.is_crunch_week ? 'bg-[#141413] text-[#faf9f5] border-[#141413]' : 
                          isExpanded ? 'bg-[#141413] text-[#faf9f5] border-[#141413]' :
                          'bg-[#e8e6dc] border-[#141413]/10 text-[#3d3d3a]'
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
                            className="px-5 pb-5 pt-0 space-y-3"
                          >
                            <div className="w-full h-px bg-[#141413]/10 mb-4 ml-12 max-w-[calc(100%-3rem)]" />
                            {sprint.tasks.map((task: any, tIdx: number) => {
                              const isAssessment = task.action_type === 'assessment';
                              const isResource = task.action_type === 'resource';
                              const isMock = task.action_type === 'mock_interview';
                              
                              if (task.action_type === 'info' || typeof task === 'string') {
                                const title = typeof task === 'string' ? task : task.title;
                                return (
                                  <div key={tIdx} className="text-xs font-bold text-[#3d3d3a] flex items-start gap-3 pl-12 py-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#141413] mt-1.5 shrink-0" />
                                    <span className="leading-relaxed">{title}</span>
                                  </div>
                                );
                              }

                              const isCompleted = completedTaskIds.has(task.action_payload || task.title);

                              return (
                                <motion.button 
                                  whileHover={!isCompleted ? { scale: 1.01, x: 2 } : {}}
                                  whileTap={!isCompleted ? { scale: 0.99 } : {}}
                                  key={tIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAssessment && !isCompleted) setActiveAssessment(task.action_payload);
                                  }}
                                  className={`w-full text-left text-xs font-bold flex items-center justify-between p-4 ml-12 rounded-xl max-w-[calc(100%-3rem)] transition-colors border shadow-sm ${
                                    isCompleted ? 'bg-[#faf9f5] text-[#3d3d3a] border-[#141413]/10 opacity-70' :
                                    isAssessment ? 'bg-[#faf9f5] hover:bg-[#e8e6dc] text-[#141413] border-[#141413] border-[1.5px]' :
                                    'bg-[#faf9f5] hover:bg-[#e8e6dc] text-[#141413] border-[#141413]/10 hover:border-[#141413]'
                                  }`}
                                >
                                  <span className="flex items-center gap-3">
                                    {isCompleted ? <CheckCircle2 size={16} className="text-[#141413]" /> : (
                                      <>
                                        {isAssessment && <PlayCircle size={16} className="text-[#141413]" />}
                                        {isResource && <BookOpen size={16} className="text-[#141413]" />}
                                        {isMock && <Code2 size={16} className="text-[#141413]" />}
                                      </>
                                    )}
                                    <span className={`font-black tracking-wide ${isCompleted ? 'line-through opacity-50' : ''}`}>{task.title}</span>
                                  </span>
                                  {isCompleted ? (
                                    <span className="text-[9px] uppercase tracking-widest font-black border border-[#141413]/20 text-[#141413] px-2 py-0.5 rounded-md bg-[#e8e6dc]">Done</span>
                                  ) : (
                                    isAssessment && <span className="text-[9px] uppercase tracking-widest font-black bg-[#faf9f5] text-[#141413] border border-[#141413] px-2 py-0.5 rounded-md shadow-sm">Challenge</span>
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
              <motion.div variants={itemVariants} className="lg:col-span-4 p-8 bg-[#faf9f5] border border-[#141413]/10 rounded-3xl flex flex-col max-h-[600px] shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Flame size={16} className="text-[#141413]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#3d3d3a]">Market Signals</span>
                </div>
                
                <p className="text-[11px] font-bold text-[#3d3d3a] uppercase tracking-widest leading-relaxed mb-6">
                  Tailored based on {plan.market_signals.length} active roles currently open at {plan.company_name}.
                </p>
                
                {/* 5. WHITE SPACE: Using internal scroll with fading edges to maintain compact bento structure */}
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {plan.market_signals.map((signal: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="p-5 bg-[#e8e6dc] border border-[#141413]/10 rounded-2xl relative"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="text-[13px] font-black uppercase tracking-wide text-[#141413] leading-tight">
                          {signal.job_title}
                        </div>
                        {signal.url && (
                          <a 
                            href={signal.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[#3d3d3a] hover:text-[#faf9f5] hover:bg-[#141413] bg-[#faf9f5] border border-[#141413]/20 p-2 rounded-lg transition-all flex-shrink-0 shadow-sm"
                            title="View full job posting"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {signal.extracted_skills.map((skill: string, sIdx: number) => (
                          <span 
                            key={sIdx} 
                            className="text-[9px] font-black tracking-widest uppercase text-[#3d3d3a] bg-[#faf9f5] border border-[#141413]/10 px-2.5 py-1 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
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
            className="fixed inset-0 z-50 bg-[#faf9f5]/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#faf9f5] border border-[#141413]/20 rounded-3xl relative shadow-xl"
            >
              <button 
                onClick={() => setActiveAssessment(null)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[#e8e6dc] border border-[#141413]/10 text-[#3d3d3a] hover:text-[#faf9f5] hover:bg-[#141413] transition-colors z-10 font-black"
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
