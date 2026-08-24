'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Target, TrendingDown, Loader2 } from 'lucide-react';
import { usePathStore } from '../../../store/usePathStore';

export default function WarRoomDashboard() {
  const [daysRemaining, setDaysRemaining] = useState(45);
  const [burnoutRisk, setBurnoutRisk] = useState(78); // High risk
  const [targetCompany, setTargetCompany] = useState('SDE-1');
  const [gapSkillsCount, setGapSkillsCount] = useState(0);
  const [totalSprintWeeks, setTotalSprintWeeks] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchPlacementPlan = usePathStore(state => state.fetchPlacementPlan);
  const profileId = usePathStore(state => state.profileId);

  useEffect(() => {
    const loadPlan = async () => {
      const safeProfileId = profileId || 1;
      const res = await fetchPlacementPlan({
        profile_id: safeProfileId,
        company_id: 'google',
        drive_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weekly_study_hours: 10
      });
      if (res && res.days_remaining !== undefined) {
        setDaysRemaining(res.days_remaining);
        setTargetCompany(res.company_name || 'SDE-1');
        setGapSkillsCount(res.gap_skills?.length || 0);
        setTotalSprintWeeks(res.weeks_available || 0);
        // Burnout risk is set based on feasibility or just a mock metric updated
        setBurnoutRisk(res.is_feasible ? 35 : 85);
      }
      setIsLoaded(true);
    };
    loadPlan();
  }, [fetchPlacementPlan, profileId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-4xl font-black uppercase text-white flex items-center gap-3">
          <Target className="text-rose-500" size={36} />
          Placement Season War Room
        </h1>
        <p className="text-xl font-bold mt-2 text-slate-400">High-Stakes Preparation Mode Active</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {!isLoaded ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
          ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Clock className="text-indigo-400" />
              Countdown to Placements
            </h2>
            
            <div className="flex items-end gap-4">
              <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                {daysRemaining}
              </div>
              <div className="text-2xl font-bold text-slate-500 mb-2 uppercase tracking-widest">
                Days Left
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Target Role</div>
                <div className="text-lg font-bold text-white">{targetCompany}</div>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Gap Skills</div>
                <div className="text-lg font-bold text-white">{gapSkillsCount} Remaining</div>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Sprint Timeline</div>
                <div className="text-lg font-bold text-emerald-400">{totalSprintWeeks} Weeks</div>
              </div>
            </div>
          </div>
          )}

        </div>
        
        <aside className="space-y-8">
          <div className={`border rounded-2xl p-6 ${
            burnoutRisk > 70 ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className={burnoutRisk > 70 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
              Burnout Risk Indicator
            </h3>
            
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-white">{burnoutRisk}%</span>
                <span className={`text-sm font-bold uppercase ${burnoutRisk > 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {burnoutRisk > 70 ? 'Critical' : 'Healthy'}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${burnoutRisk > 70 ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-emerald-500'}`}
                  style={{ width: `${burnoutRisk}%` }}
                />
              </div>
            </div>
            
            {burnoutRisk > 70 && (
              <div className="mt-6 bg-slate-950/50 p-4 rounded-xl border border-rose-500/30">
                <div className="flex gap-3 mb-2">
                  <TrendingDown className="text-rose-400" size={20} />
                  <p className="text-sm font-bold text-slate-200">System detects sustained high cognitive load (12+ hrs/day).</p>
                </div>
                <p className="text-xs text-slate-400 pl-8">
                  Your mentor has been notified. Recommendation: Mandatory 24-hour break from coding assessments.
                </p>
                <button className="w-full mt-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold py-2 rounded-lg border border-rose-500/50 transition-colors">
                  Acknowledge & Schedule Break
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
