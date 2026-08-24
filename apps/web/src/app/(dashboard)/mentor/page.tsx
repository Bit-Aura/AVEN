'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  Sparkles, 
  UserCheck, 
  Clock 
} from 'lucide-react';
import { usePathStore } from '../../../store/usePathStore';

export default function MentorDashboard() {
  const [learners, setLearners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchMentorQueue = usePathStore(state => state.fetchMentorQueue);

  useEffect(() => {
    fetchMentorQueue({ 
      profile_ids: [1, 2, 3],
      drive_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }).then((res: any) => {
      if (res && res.queue && res.queue.length > 0) {
        setLearners(res.queue.map((item: any) => ({
          id: `L-${item.profile_id}`,
          name: item.display_label || `Learner #${item.profile_id}`,
          role: 'Backend Software Engineer',
          readiness: Math.round(item.readiness_pct),
          burnoutRisk: Math.round(item.triage_score * 100),
          status: item.recommended_action || (item.breakthrough_zone ? 'Breakthrough Zone' : 'Standard Traversal'),
          lastActive: '10m ago',
          hoursToday: item.gap_skills_count || 0
        })));
      } else {
        setLearners([
          {
            id: 'L-1023',
            name: 'Surya Kumar',
            role: 'Backend Software Engineer',
            readiness: 88,
            burnoutRisk: 78,
            status: 'Prioritize System Design Mock (Breakthrough Zone)',
            lastActive: '2 mins ago',
            hoursToday: 14
          },
          {
            id: 'L-0891',
            name: 'Priya Sharma',
            role: 'Distributed Systems Dev',
            readiness: 74,
            burnoutRisk: 62,
            status: 'Reinforce Async SQLAlchemy & DB Design',
            lastActive: '1 hr ago',
            hoursToday: 9
          },
          {
            id: 'L-0442',
            name: 'Alex Chen',
            role: 'Full-Stack Developer',
            readiness: 92,
            burnoutRisk: 35,
            status: 'Optimal Velocity • Ready for Canonical Drive',
            lastActive: '30 mins ago',
            hoursToday: 6
          }
        ]);
      }
    }).catch(() => {
      setLearners([
        {
          id: 'L-1023',
          name: 'Surya Kumar',
          role: 'Backend Software Engineer',
          readiness: 88,
          burnoutRisk: 78,
          status: 'Prioritize System Design Mock (Breakthrough Zone)',
          lastActive: '2 mins ago',
          hoursToday: 14
        },
        {
          id: 'L-0891',
          name: 'Priya Sharma',
          role: 'Distributed Systems Dev',
          readiness: 74,
          burnoutRisk: 62,
          status: 'Reinforce Async SQLAlchemy & DB Design',
          lastActive: '1 hr ago',
          hoursToday: 9
        }
      ]);
    }).finally(() => setIsLoading(false));
  }, [fetchMentorQueue]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Operations Control</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Mentor Intervention Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time learner triage queue ranked by Bayesian Knowledge Tracing struggles and burnout risk
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-surface border border-border px-3.5 py-2 rounded-xl">
          <span className="text-slate-400">Active Cohort:</span>
          <span className="font-bold text-white">Fall SDE Batch</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-glass">
        <div className="p-6 border-b border-border bg-surface-secondary/40 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={16} />
            <span>Learners Requiring Triage Action</span>
          </h2>
          <div className="text-xs font-semibold text-slate-400">
            Total Monitored: {learners.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-secondary/70 text-slate-400 text-[11px] uppercase tracking-wider border-b border-border">
                <th className="p-4 font-bold">Learner</th>
                <th className="p-4 font-bold">Target Role</th>
                <th className="p-4 font-bold">Readiness & Urgency Score</th>
                <th className="p-4 font-bold">Study Load</th>
                <th className="p-4 font-bold">Intervention Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="animate-spin text-brand-400 mx-auto" size={28} />
                  </td>
                </tr>
              ) : (
                learners.map((learner) => (
                  <tr key={learner.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{learner.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{learner.id} • Last active {learner.lastActive}</div>
                      <div className="text-[11px] font-semibold mt-0.5 text-indigo-400">
                        {learner.status}
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{learner.role}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-extrabold ${
                          learner.burnoutRisk > 70 ? 'text-rose-400' : learner.burnoutRisk > 50 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {learner.burnoutRisk}%
                        </span>
                        {learner.burnoutRisk > 70 && <TrendingUp className="text-rose-400" size={14} />}
                      </div>
                      <div className="w-28 h-1.5 bg-surface-secondary rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${
                            learner.burnoutRisk > 70 ? 'bg-rose-500' : learner.burnoutRisk > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${learner.burnoutRisk}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200">{learner.hoursToday} hrs today</div>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => alert(`Initiating mentor outreach for ${learner.name}`)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          learner.burnoutRisk > 70 
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-glow-rose' 
                            : 'bg-surface-secondary hover:bg-surface-tertiary text-slate-300 border border-border'
                        }`}
                      >
                        <MessageSquare size={13} />
                        <span>{learner.burnoutRisk > 70 ? 'Intervene Now' : 'Message'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
