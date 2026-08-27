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
  LogOut,
  UserCheck,
  ChevronLeft,
  ChevronRight,
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
  const isSidebarOpen = usePathStore((state) => state.isSidebarOpen);
  const toggleSidebar = usePathStore((state) => state.toggleSidebar);
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
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out bg-[#3d3d3a] flex flex-col shrink-0 min-h-screen select-none`}>
      <div className={`h-16 border-b border-[#141413]/20 flex items-center ${isSidebarOpen ? 'px-4 justify-between' : 'px-0 justify-center cursor-pointer hover:bg-[#faf9f5]/10 transition-colors'}`} onClick={!isSidebarOpen ? toggleSidebar : undefined}>
        {isSidebarOpen ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 shrink-0 rounded bg-[#faf9f5] flex items-center justify-center border border-[#faf9f5]">
              <BrainCircuit className="text-[#141413]" size={18} />
            </div>
            <div className="flex items-center overflow-hidden">
              <span className="font-black text-[#faf9f5] uppercase tracking-wider text-sm truncate">PathFinder</span>
              <span className="ml-1.5 shrink-0 text-[9px] uppercase font-black px-1 py-0.5 rounded bg-[#3d3d3a] text-[#faf9f5] border border-[#3d3d3a]">
                AVEN
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded bg-[#faf9f5] flex items-center justify-center border border-[#faf9f5]">
            <BrainCircuit className="text-[#141413]" size={18} />
          </div>
        )}
        
        {isSidebarOpen && (
          <button 
            onClick={toggleSidebar}
            className="w-8 h-8 shrink-0 rounded flex items-center justify-center text-[#faf9f5]/70 hover:text-[#faf9f5] hover:bg-[#faf9f5]/10 transition-colors ml-1"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {/* Target Role Context Banner (For Learners) or Role Identity Banner (Mentors/Admins) */}
      {isSidebarOpen && (
        <div className="p-4 mx-3 my-3 rounded bg-[#e8e6dc] border border-[#d6d3c4]">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black text-[#3d3d3a]/80 uppercase tracking-wider">
            {userRole === 'ADMIN' ? 'Platform Control' : userRole === 'MENTOR' ? 'Mentor Mode' : 'Target Role'}
          </div>
          <span
            className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#3d3d3a] text-[#faf9f5] border border-[#3d3d3a] flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#faf9f5] animate-pulse" />
            {userRole === 'ADMIN' ? 'Administrator' : userRole === 'MENTOR' ? 'Mentor' : 'Learner'}
          </span>
        </div>

        {userRole === 'LEARNER' ? (
          <>
            <div className="text-sm font-black text-[#141413] uppercase tracking-tight truncate mt-1">{targetRole}</div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-[10px] text-[#3d3d3a]/80 uppercase font-bold tracking-widest">Readiness</span>
              <span className="font-black text-[#141413]">{readinessScore}%</span>
            </div>
            <div className="w-full h-2 bg-[#d6d3c4] rounded mt-2 border border-[#d6d3c4] overflow-hidden">
              <div 
                className="h-full bg-[#3d3d3a] transition-all duration-700" 
                style={{ width: `${Math.max(readinessScore, 5)}%` }} 
              />
            </div>
          </>
        ) : (
          <div className="text-xs font-bold text-[#3d3d3a]/80 mt-1">
            {userRole === 'ADMIN'
              ? 'Full platform administration, user & mentor governance active.'
              : 'Assigned 1-on-1 human guidance & session operations active.'}
          </div>
        )}
      </div>
      )}

      {/* Navigation Links */}
      <nav className={`flex-1 overflow-y-auto pt-2 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
        {navigationGroups.map((group) => (
          <div key={group.title} className={isSidebarOpen ? '' : 'flex flex-col items-center'}>
            {isSidebarOpen ? (
              <div className="px-3 text-[10px] font-black uppercase tracking-widest text-[#87867f] mb-3 mt-4">
                {group.title}
              </div>
            ) : (
              <div className="h-px w-8 bg-[#87867f]/30 my-4" />
            )}
            <div className={`space-y-1 ${isSidebarOpen ? '' : 'w-full flex flex-col items-center'}`}>
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/learner' && item.href !== '/mentor' && item.href !== '/admin' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isSidebarOpen ? undefined : item.name}
                    className={`flex items-center ${isSidebarOpen ? 'px-3' : 'justify-center w-12'} py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all group ${
                      isActive 
                        ? 'bg-[#e8e6dc] text-[#141413]' 
                        : 'text-[#faf9f5]/70 hover:text-[#141413] hover:bg-[#e8e6dc]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon 
                        size={isSidebarOpen ? 16 : 20} 
                        className={isActive ? 'text-[#141413]' : 'text-[#faf9f5]/70 group-hover:text-[#141413]'} 
                      />
                      {isSidebarOpen && <span>{item.name}</span>}
                    </div>
                    {isSidebarOpen && item.badge && (
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ml-3 transition-colors ${
                        isActive 
                          ? 'bg-[#3d3d3a] text-[#faf9f5] border border-[#3d3d3a]' 
                          : 'bg-[#faf9f5]/10 text-[#faf9f5] border border-[#faf9f5]/20 group-hover:bg-[#3d3d3a] group-hover:text-[#faf9f5] group-hover:border-[#3d3d3a]'
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
      <div className={`p-4 border-t border-[#141413]/20 bg-[#3d3d3a] flex ${isSidebarOpen ? 'items-center justify-between' : 'flex-col items-center gap-4'}`}>
        <div className={`flex items-center gap-2.5 overflow-hidden ${!isSidebarOpen && 'justify-center'}`}>
          {isLoaded && user ? (
            <SafeUserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded" } }} />
          ) : (
            <div className="w-8 h-8 shrink-0 rounded bg-[#e8e6dc] flex items-center justify-center font-black text-[#141413] text-xs border border-[#e8e6dc]">
              {userInitials}
            </div>
          )}
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-[#faf9f5] truncate max-w-[90px]">{userName}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#faf9f5]/10 text-[#faf9f5] border border-[#faf9f5]/20 shrink-0">
                  {userRole === 'ADMIN' ? 'Admin' : userRole === 'MENTOR' ? 'Mentor' : 'Learner'}
                </span>
              </div>
              <div className="text-[10px] font-bold text-[#faf9f5]/70 truncate">{userEmail}</div>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className={`p-2 rounded text-[#faf9f5]/70 hover:text-[#141413] hover:bg-[#e8e6dc] transition-colors ${!isSidebarOpen && 'w-full flex justify-center'}`}
          title="Sign Out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
