'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { usePathStore } from '../../../store/usePathStore';

export default function MentorDashboard() {
  const [learners, setLearners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchMentorQueue = usePathStore(state => state.fetchMentorQueue);

  useEffect(() => {
    fetchMentorQueue({ cohort_id: 'default' }).then((res) => {
      if (res && res.queue) {
        setLearners(res.queue.map((item: any) => ({
          id: `L-${item.profile_id}`,
          name: `Learner ${item.profile_id}`,
          role: 'SDE',
          burnoutRisk: Math.round(item.triage_score * 100),
          status: item.intervention_reason,
          lastActive: 'Recently',
          hoursToday: 10
        })));
      } else {
        // Fallback mock if API not populated
        setLearners([
          {
            id: 'L-1023',
            name: 'Surya Kumar',
            role: 'SDE-1',
            burnoutRisk: 78,
            status: 'Critical',
            lastActive: '2 mins ago',
            hoursToday: 14
          },
          {
            id: 'L-0891',
            name: 'Priya Sharma',
            role: 'Data Engineer',
            burnoutRisk: 62,
            status: 'Warning',
            lastActive: '1 hr ago',
            hoursToday: 9
          }
        ]);
      }
    }).finally(() => setIsLoading(false));
  }, [fetchMentorQueue]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase text-white flex items-center gap-3">
            <Shield className="text-indigo-400" size={36} />
            Ops Intervention Hub
          </h1>
          <p className="text-xl font-bold mt-2 text-slate-400">Monitoring Placement Season Cohort</p>
        </div>
      </header>

      <main>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="text-rose-500" />
              Learners Ranked by Burnout Risk
            </h2>
            <div className="text-sm font-bold text-slate-400">Total Active: 3</div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-slate-800">Learner</th>
                  <th className="p-4 font-bold border-b border-slate-800">Target Role</th>
                  <th className="p-4 font-bold border-b border-slate-800">Burnout Risk</th>
                  <th className="p-4 font-bold border-b border-slate-800">Today's Load</th>
                  <th className="p-4 font-bold border-b border-slate-800">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="animate-spin text-indigo-400 mx-auto" size={32} />
                    </td>
                  </tr>
                ) : learners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No learners require intervention right now.
                    </td>
                  </tr>
                ) : (
                  learners.map((learner) => (
                  <tr key={learner.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{learner.name}</div>
                      <div className="text-xs text-slate-500">{learner.id} • Last active: {learner.lastActive}</div>
                      <div className="text-xs text-rose-400 mt-1">{learner.status}</div>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{learner.role}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${
                          learner.burnoutRisk > 70 ? 'text-rose-400' : learner.burnoutRisk > 50 ? 'text-orange-400' : 'text-emerald-400'
                        }`}>
                          {learner.burnoutRisk}%
                        </span>
                        {learner.burnoutRisk > 70 && <TrendingUp className="text-rose-500" size={16} />}
                      </div>
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full ${learner.burnoutRisk > 70 ? 'bg-rose-500' : learner.burnoutRisk > 50 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          style={{ width: `${learner.burnoutRisk}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-300">{learner.hoursToday} hrs</div>
                    </td>
                    <td className="p-4">
                      <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        learner.burnoutRisk > 70 
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}>
                        <MessageSquare size={16} />
                        {learner.burnoutRisk > 70 ? 'Intervene Now' : 'Message'}
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
