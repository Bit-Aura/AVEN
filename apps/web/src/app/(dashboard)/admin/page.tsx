'use client';

import { useState } from 'react';
import { 
  Briefcase, 
  Building2, 
  Users, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Calendar,
  Layers,
  Search
} from 'lucide-react';

export default function AdminWarRoom() {
  const [notifiedDrive, setNotifiedDrive] = useState<string | null>(null);

  const drives = [
    { company: 'Canonical', role: 'Backend SWE (Python/Go)', date: 'In 4 Days', nodes: ['FastAPI Basics', 'PostgreSQL', 'Docker'], eligibleCount: 14 },
    { company: 'Stripe', role: 'Infrastructure Engineer', date: 'In 2 Weeks', nodes: ['Distributed Systems', 'System Design', 'API Design'], eligibleCount: 8 },
    { company: 'Palantir', role: 'Data Software Engineer', date: 'In 3 Weeks', nodes: ['SQL Query Optimization', 'Data Pipelines', 'Python Advanced'], eligibleCount: 11 },
  ];

  const handleNotify = (companyName: string) => {
    setNotifiedDrive(companyName);
    setTimeout(() => setNotifiedDrive(null), 3000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Institutional Placement</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            TPO & Campus Hiring Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Map verified cohort skill competencies against upcoming enterprise campus placement drives
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-surface border border-border px-3.5 py-2 rounded-xl">
          <Users size={14} className="text-indigo-400" />
          <span className="text-slate-400">Enrolled Batch:</span>
          <span className="font-bold text-white">48 Learners</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Upcoming Enterprise Hiring Drives */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Upcoming Enterprise Hiring Drives
            </h2>
            <span className="text-xs text-slate-500 font-semibold">{drives.length} Active Drives</span>
          </div>

          <div className="space-y-4">
            {drives.map((d, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/50 shadow-glass transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-secondary border border-border flex items-center justify-center font-bold text-indigo-400 text-sm">
                      {d.company[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{d.company}</h3>
                      <p className="text-xs text-slate-400 font-medium">Target Role: {d.role}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-bold flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>{d.date}</span>
                  </span>
                </div>

                {/* Prerequisite Competencies Required */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Hard Prerequisite Skills:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {d.nodes.map((n, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-xs text-slate-300 font-semibold">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Eligibility & Action */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-extrabold text-emerald-400 text-sm">{d.eligibleCount}</span>
                    <span className="text-slate-400">learners fully ready (100% prerequisite match)</span>
                  </div>

                  <button
                    onClick={() => handleNotify(d.company)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-glow-indigo transition-all"
                  >
                    {notifiedDrive === d.company ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-300" />
                        <span>Invites Sent!</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Notify Eligible Cohort</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cohort Aggregation Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-glass space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={15} className="text-indigo-400" />
              <span>Cohort Readiness Summary</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-secondary/70 border border-border">
                <div className="font-extrabold text-white text-base">29 / 48</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Learners ready for at least one enterprise drive</div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-secondary/70 border border-border">
                <div className="font-extrabold text-amber-400 text-base">12 Learners</div>
                <div className="text-slate-400 text-[11px] mt-0.5">1 milestone away from Canonical eligibility</div>
              </div>
            </div>

            <button 
              onClick={() => alert("Broadcasting milestone acceleration nudge to 12 near-ready candidates")}
              className="w-full py-2.5 px-4 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-xs font-bold text-slate-200 transition-colors"
            >
              Send Target Nudge to Near-Ready
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
