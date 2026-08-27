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
  ShieldCheck,
  BrainCircuit,
  Users,
  Inbox,
  Calendar,
  LogOut,
  UserCheck,
  Mic,
  Map,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { usePathStore } from '../../store/usePathStore';
import { useSafeUser, SafeUserButton, isClerkConfigured } from '../../lib/clerkSafe';
import { logoutUser } from '../../api/client';

export default function Sidebar() {
  const pathname = usePathname();
  const targetRole = usePathStore((state) => state.targetRole);
  const readinessScore = usePathStore((state) => state.readinessScore);
  const { user, isLoaded } = useSafeUser();

  let clerkInstance: any = null;
  if (isClerkConfigured) {
    try {
      clerkInstance = useClerk();
    } catch {
      clerkInstance = null;
    }
  }

  const userRole = (user?.role || 'LEARNER').toUpperCase();
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'demo@pathfinder.dev';
  const userName = user?.fullName || user?.firstName || user?.username || 'Demo User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DU';

  // Role-Specific Navigation Definitions
  const learnerGroups = [
    {
      title: 'Core Engine',
      items: [
        { name: 'Learning Path', href: '/learner', icon: Compass, badge: 'Live' },
        { name: 'AI Mock Interview', href: '/learner/interview', icon: Mic, badge: 'Voice' },
        { name: '1-on-1 Mentorship', href: '/learner/mentor', icon: Users },
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
    }
  ];

  const mentorGroups = [
    {
      title: 'Mentor Operations',
      items: [
        { name: 'Mentor Connect', href: '/mentor', icon: ShieldAlert, badge: 'Live' },
        { name: 'Learner 360° Intel', href: '/mentor/learner-intel', icon: BrainCircuit, badge: '360°' },
      ]
    }
  ];

  const adminGroups = [
    {
      title: 'Administration',
      items: [
        { name: 'Platform Admin', href: '/admin', icon: ShieldCheck, badge: 'Master' },
        { name: 'Roadmap Topology Sync', href: '/admin/roadmap-sync', icon: Map, badge: 'New' },
        { name: 'Mentor Operations', href: '/mentor', icon: ShieldAlert },
      ]
    },
    {
      title: 'Curriculum Explorer',
      items: [
        { name: 'Learning Path View', href: '/learner', icon: Compass },
        { name: 'Skill Graph View', href: '/learner/graph', icon: Network },
        { name: 'Market Radar', href: '/market-radar', icon: Radar },
      ]
    }
  ];

  const navigationGroups = userRole === 'ADMIN'
    ? adminGroups
    : userRole === 'MENTOR'
      ? mentorGroups
      : learnerGroups;

  const handleSignOut = async () => {
    logoutUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('last_clerk_user');
      localStorage.removeItem('pathfinder_profile_id');
      localStorage.removeItem('pathfinder_diagnostic_complete');
      localStorage.removeItem('aven_auth_token');
      localStorage.removeItem('aven_auth_user');
    }
    usePathStore.setState({ profileId: null, diagnosticComplete: false, nodes: [], edges: [], activePathPlan: null });

    if (clerkInstance?.signOut) {
      try {
        await clerkInstance.signOut({ redirectUrl: '/sign-in' });
        return;
      } catch (e) {
        console.error('Clerk sign out error', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  };

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

      {/* Target Role Context Banner (For Learners) or Role Identity Banner (Mentors/Admins) */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-surface-secondary/50 border border-border/80">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {userRole === 'ADMIN' ? 'Platform Control' : userRole === 'MENTOR' ? 'Mentor Mode' : 'Target Role'}
          </div>
          <span
            className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            {userRole === 'ADMIN' ? 'Administrator' : userRole === 'MENTOR' ? 'Mentor' : 'Learner'}
          </span>
        </div>

        {userRole === 'LEARNER' ? (
          <>
            <div className="text-sm font-bold text-white truncate mt-1">{targetRole}</div>
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
          </>
        ) : (
          <div className="text-xs font-semibold text-slate-300 mt-1">
            {userRole === 'ADMIN'
              ? 'Full platform administration, user & mentor governance active.'
              : 'Assigned 1-on-1 human guidance & session operations active.'}
          </div>
        )}
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
                const isActive = pathname === item.href || (item.href !== '/mentor' && item.href !== '/admin' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${isActive
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-secondary/50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        size={16}
                        className={isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-400'}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${isActive
                        ? 'bg-brand-500/20 text-brand-300'
                        : item.badge === 'Live'
                          ? 'bg-rose-500/20 text-rose-400'
                          : item.badge === 'Sprint'
                            ? 'bg-white/20 text-white'
                            : item.badge === 'Master'
                              ? 'bg-rose-500/20 text-rose-400'
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

      {/* Bottom Profile & Sign Out Bar */}
      <div className="p-4 border-t border-border bg-surface-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {isLoaded && user ? (
            <SafeUserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-full" } }} />
          ) : (
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              {userInitials}
            </div>
          )}
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate max-w-[90px]">{userName}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)] shrink-0">
                {userRole === 'ADMIN' ? 'Admin' : userRole === 'MENTOR' ? 'Mentor' : 'Learner'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">{userEmail}</div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Sign Out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
