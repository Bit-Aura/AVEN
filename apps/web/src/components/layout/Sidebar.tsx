'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Compass, 
  Network, 
  Radar, 
  Award, 
  Layers, 
  Flame, 
  ShieldAlert, 
  Briefcase,
  ChevronRight,
  BrainCircuit
} from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';

const navigationGroups = [
  {
    title: 'Core Engine',
    items: [
      { name: 'Learning Path', href: '/learner', icon: Compass, badge: 'Live' },
      { name: 'Day-One Simulator', href: '/learner/simulator', icon: BrainCircuit, badge: 'Job' },
      { name: 'Skill Graph', href: '/learner/graph', icon: Network },
      { name: 'Market Radar', href: '/market-radar', icon: Radar, badge: 'ETL' },
      { name: 'Proof Portfolio', href: '/learner/portfolio', icon: Award },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { name: 'Path Planner', href: '/planner', icon: Layers },
      { name: 'War Room', href: '/war-room', icon: Flame, badge: 'Sprint' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Mentor Hub', href: '/mentor', icon: ShieldAlert },
      { name: 'Hiring Admin', href: '/admin', icon: Briefcase },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const targetRole = usePathStore((state) => state.targetRole);
  const readinessScore = usePathStore((state) => state.readinessScore);

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-glow-indigo">
          <BrainCircuit className="text-white" size={20} />
        </div>
        <div>
          <span className="font-extrabold text-white tracking-tight text-lg">PathFinder</span>
          <span className="ml-1.5 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            AVEN
          </span>
        </div>
      </div>

      {/* Target Role Context Banner */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-surface-secondary/50 border border-border/80">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Role</div>
        <div className="text-sm font-bold text-white truncate">{targetRole}</div>
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">Readiness</span>
          <span className="font-bold text-emerald-400">{readinessScore}%</span>
        </div>
        <div className="w-full h-1.5 bg-surface rounded-full mt-1.5 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700" 
            style={{ width: `${Math.max(readinessScore, 5)}%` }} 
          />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto pt-2">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-glow-indigo'
                        : 'text-slate-300 hover:text-white hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-surface-tertiary text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Profile Info */}
      <div className="p-4 border-t border-border bg-surface-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
            DL
          </div>
          <div>
            <div className="text-xs font-bold text-white">Demo Learner</div>
            <div className="text-[10px] text-slate-400">demo@pathfinder.dev</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
