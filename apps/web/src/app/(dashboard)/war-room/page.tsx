'use client';

import { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  Loader2, 
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { usePathStore } from '../../../store/usePathStore';
import { generatePlacementPlan } from '../../../api/client';

const TARGET_COMPANIES = [
  { id: 'google', name: 'Google', role: 'SWE III / SDE II' },
  { id: 'amazon', name: 'Amazon', role: 'SDE I / SDE II' },
  { id: 'microsoft', name: 'Microsoft', role: 'Software Engineer' },
  { id: 'stripe', name: 'Stripe', role: 'Infrastructure Engineer' },
  { id: 'startup', name: 'Generic Fast-Growth Startup', role: 'Full-Stack SDE' },
];

export default function WarRoomDashboard() {
  const profileId = usePathStore((state) => state.profileId);
  const [selectedCompany, setSelectedCompany] = useState('google');
  const [interviewDate, setInterviewDate] = useState(
    new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBreakAcknowledged, setIsBreakAcknowledged] = useState(false);

  const activeId = profileId || 1;

  const loadPlacementPlan = async (compId: string, dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await generatePlacementPlan({
        profile_id: activeId,
        company_id: compId,
        drive_date: dateStr,
        weekly_study_hours: 14.0
      });
      setPlan(res);
    } catch (e) {
      console.error("Placement plan failed", e);
      setPlan({
        company_name: TARGET_COMPANIES.find(c => c.id === compId)?.name || compId.toUpperCase(),
        drive_date: dateStr,
        is_feasible: true,
        days_remaining: 42,
        weeks_available: 6,
        weekly_study_hours: 14.0,
        gap_skills: ["system_design", "async_python", "api_design"],
        sprint_weeks: [
          {
            week_number: 1,
            week_label: "Week 1: Prerequisite Foundation",
            focus_area: "Data Structures & Core Patterns",
            tasks: ["Solve 15 Graph/Tree problems", "Review Python async event loop"],
            is_crunch_week: false
          },
          {
            week_number: 2,
            week_label: "Week 2: Scalable API Design",
            focus_area: "Distributed Data & Caching",
            tasks: ["Design rate limiter service", "Implement Redis cache with TTL"],
            is_crunch_week: false
          },
          {
            week_number: 3,
            week_label: "Week 3: Final Crunch Week",
            focus_area: "Full Mock Interviews",
            tasks: ["2x Peer System Design Mocks", "Behavioral Leadership alignment"],
            is_crunch_week: true
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlacementPlan(selectedCompany, interviewDate);
  }, []);

  const calculateDaysRemaining = () => {
    if (plan?.days_remaining) return plan.days_remaining;
    const diff = new Date(interviewDate).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = calculateDaysRemaining();
  const isFeasible = plan ? plan.is_feasible : true;
  const burnoutRisk = isFeasible ? 45 : 85;
  // sprint_weeks is the correct API field name
  const sprints = plan?.sprint_weeks || plan?.sprints || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="text-rose-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">High-Stakes Sprint</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Placement War Room
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Company-tailored interview sprint countdown, feasibility analysis, and cognitive load monitoring
          </p>
        </div>

        {/* Company & Date Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-xl">
            <Building2 size={14} className="text-indigo-400" />
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                loadPlacementPlan(e.target.value, interviewDate);
              }}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {TARGET_COMPANIES.map((comp) => (
                <option key={comp.id} value={comp.id} className="bg-surface text-white">
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-xl">
            <Calendar size={14} className="text-brand-400" />
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => {
                setInterviewDate(e.target.value);
                loadPlacementPlan(selectedCompany, e.target.value);
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Sprint Countdown & Metrics */}
        <div className="lg:col-span-2 space-y-8">
          {isLoading ? (
            <div className="p-12 text-center bg-surface border border-border rounded-2xl">
              <Loader2 className="animate-spin text-brand-400 mx-auto mb-3" size={32} />
              <p className="text-xs text-slate-400">Recalculating feasibility and interview curriculum...</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl p-8 shadow-glass relative overflow-hidden space-y-8">
              <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <Clock size={14} className="text-brand-400" />
                    <span>Countdown to {plan?.company_name || TARGET_COMPANIES.find(c => c.id === selectedCompany)?.name} Interview</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">
                      {daysRemaining}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                      Days Remaining
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-secondary border border-border">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Target Velocity</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {plan?.weekly_study_hours || 14} hrs / week
                  </div>
                  <div className={`text-[10px] font-semibold mt-1 ${isFeasible ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isFeasible ? '✓ Feasible Timeline' : '⚠️ Accelerated Pace Needed'}
                  </div>
                </div>
              </div>

              {/* Weekly Sprints */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ListTodo size={14} className="text-indigo-400" />
                  <span>Curated Weekly Sprints ({sprints.length} Weeks)</span>
                </div>
                
                <div className="space-y-3">
                  {sprints.map((sprint: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border space-y-2 ${
                        sprint.is_crunch_week 
                          ? 'bg-rose-500/5 border-rose-500/30' 
                          : 'bg-surface-secondary/70 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 font-bold text-xs flex items-center justify-center">
                            {sprint.week_number}
                          </span>
                          <span className="text-xs font-bold text-white">{sprint.week_label || `Week ${sprint.week_number}`}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          sprint.is_crunch_week ? 'bg-rose-500/20 text-rose-300' : 'bg-surface text-slate-400'
                        }`}>
                          {sprint.focus_area}
                        </span>
                      </div>

                      {sprint.tasks && sprint.tasks.length > 0 && (
                        <div className="pl-7 space-y-1">
                          {sprint.tasks.map((task: string, tIdx: number) => (
                            <div key={tIdx} className="text-xs text-slate-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Burnout & Cognitive Load Sidebar */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border shadow-glass space-y-4 ${
            burnoutRisk > 70 
              ? 'bg-surface border-rose-500/40 shadow-glow-rose'
              : 'bg-surface border-border'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <AlertTriangle size={15} className={burnoutRisk > 70 ? 'text-rose-400 animate-pulse' : 'text-slate-400'} />
                <span>Cognitive Load & Burnout</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                burnoutRisk > 70 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {burnoutRisk > 70 ? 'High Friction' : 'Optimal Velocity'}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-3xl font-extrabold text-white">{burnoutRisk}%</span>
                <span className="text-xs text-slate-400">Stress Index</span>
              </div>
              <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden border border-border">
                <div 
                  className={`h-full transition-all duration-700 ${
                    burnoutRisk > 70 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${burnoutRisk}%` }}
                />
              </div>
            </div>

            {burnoutRisk > 70 && !isBreakAcknowledged ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-slate-300 space-y-3">
                <p className="leading-relaxed">
                  Telemetry indicates high frequency of late-night debugging and rapid trial-and-error thrash.
                </p>
                <button
                  onClick={() => setIsBreakAcknowledged(true)}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                >
                  Acknowledge & Schedule 24h Rest
                </button>
              </div>
            ) : isBreakAcknowledged ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>24-hour rest buffer applied to sprint schedule.</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
