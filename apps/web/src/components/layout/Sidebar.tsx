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
  Trophy,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { usePathStore } from '../../store/usePathStore';
import { useSafeUser, SafeUserButton, isClerkConfigured } from '../../lib/clerkSafe';
import { logoutUser } from '../../api/client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserSettingsModal, Tab } from '../profile/UserSettingsModal';

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
  const userAvatarUrl = user?.imageUrl;

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<Tab>('account');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        { name: 'Hackathon Radar', href: '/learner/hackathons', icon: Trophy, badge: 'LIVE' },
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
        { name: 'Hackathon Radar', href: '/learner/hackathons', icon: Trophy, badge: 'LIVE' },
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
        { name: 'Hackathon Radar', href: '/learner/hackathons', icon: Trophy, badge: 'LIVE' },
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

  const openSettings = (tab: Tab) => {
    setIsProfileMenuOpen(false);
    if (isClerkConfigured && clerkInstance?.openUserProfile) {
      clerkInstance.openUserProfile();
    } else {
      setSettingsTab(tab);
      setIsSettingsModalOpen(true);
    }
  };

  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out bg-aven-primary flex flex-col shrink-0 min-h-screen select-none`}>
      <div className={`h-16 border-b border-aven-text/20 flex items-center ${isSidebarOpen ? 'px-4 justify-between' : 'px-0 justify-center cursor-pointer hover:bg-aven-base/10 transition-colors'}`} onClick={!isSidebarOpen ? toggleSidebar : undefined}>
        {isSidebarOpen ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full overflow-hidden border border-[#faf9f5]/20 shadow-sm">
              <img src="/Logo.png" alt="AVEN Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center overflow-hidden">
              <span className="font-black text-[#faf9f5] uppercase tracking-widest text-xl truncate">AVEN</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center rounded-full overflow-hidden border border-[#faf9f5]/20 shadow-sm">
            <img src="/Logo.png" alt="AVEN Logo" className="w-full h-full object-cover" />
          </div>
        )}

        {isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 shrink-0 rounded flex items-center justify-center text-aven-base opacity-70 hover:opacity-100 hover:bg-white/10 active:scale-90 transition-all ml-1"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {/* Target Role Context Banner (For Learners) or Role Identity Banner (Mentors/Admins) */}
      {isSidebarOpen && (
        <div className="p-4 mx-3 my-3 rounded bg-white/5 border border-white/10 text-aven-base">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black text-white/60 uppercase tracking-wider">
              {userRole === 'ADMIN' ? 'Platform Control' : userRole === 'MENTOR' ? 'Mentor Mode' : 'Target Role'}
            </div>
            <span
              className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-aven-secondary text-white border border-aven-secondary flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {userRole === 'ADMIN' ? 'Administrator' : userRole === 'MENTOR' ? 'Mentor' : 'Learner'}
            </span>
          </div>

          {userRole === 'LEARNER' ? (
            <>
              <div className="text-sm font-black text-white uppercase tracking-tight truncate mt-1">{targetRole}</div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="text-[10px] text-white/60 uppercase font-black tracking-widest">Readiness</span>
                <span className="font-black text-white">{readinessScore}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded mt-2 border border-white/20 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-aven-status-active transition-all duration-700"
                  style={{ width: `${Math.max(readinessScore, 5)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xs font-bold text-aven-text-subtle/80 mt-1">
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
              <div className="px-3 text-[10px] font-black uppercase tracking-widest text-aven-text-muted mb-3 mt-4">
                {group.title}
              </div>
            ) : (
              <div className="h-px w-8 bg-aven-text-muted/30 my-4" />
            )}
            <div className={`space-y-1 ${isSidebarOpen ? '' : 'w-full flex flex-col items-center'}`}>
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/learner' && item.href !== '/mentor' && item.href !== '/admin' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isSidebarOpen ? undefined : item.name}
                    className={`flex items-center ${isSidebarOpen ? 'px-3' : 'justify-center w-12'} py-2.5 rounded text-xs font-black uppercase tracking-widest transition-all duration-200 active:scale-95 group ${isActive
                      ? 'bg-white text-aven-primary shadow-md'
                      : 'text-aven-base opacity-70 hover:opacity-100 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        size={isSidebarOpen ? 16 : 20}
                        className={isActive ? 'text-aven-primary' : 'text-aven-base opacity-70 group-hover:opacity-100'}
                      />
                      {isSidebarOpen && <span>{item.name}</span>}
                    </div>
                    {isSidebarOpen && item.badge && (
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ml-3 transition-colors ${isActive
                        ? 'bg-aven-secondary text-white border border-aven-secondary'
                        : 'bg-aven-base/10 text-aven-base border border-aven-base/20 group-hover:bg-aven-secondary group-hover:text-white group-hover:border-aven-secondary'
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
      <div className="relative border-t border-[#141413]/20 bg-[#3d3d3a]" ref={profileMenuRef}>
        <AnimatePresence>
          {isProfileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute bottom-[calc(100%+8px)] ${isSidebarOpen ? 'left-4 w-[calc(100%-32px)]' : 'left-4 w-56'} bg-[#faf9f5] border border-[#d6d3c4] rounded shadow-[0_8px_32px_-8px_rgba(20,20,19,0.5)] z-50 overflow-hidden flex flex-col`}
            >
              <div className="p-4 border-b border-[#d6d3c4]/50 bg-[#e8e6dc]/30">
                <div className="text-[10px] font-black text-[#87867f] uppercase tracking-widest mb-1">Authenticated As</div>
                <div className="text-sm font-black text-[#141413] truncate">{userName}</div>
                <div className="text-xs font-bold text-[#87867f] truncate">{userEmail}</div>
              </div>

              <div className="p-2 flex flex-col gap-1">
                <button
                  className="flex items-center gap-3 px-3 py-2 w-full text-left rounded text-xs font-bold text-[#3d3d3a] hover:bg-[#e8e6dc] transition-colors group"
                  onClick={() => openSettings('account')}
                >
                  <UserCheck size={16} className="text-[#87867f] group-hover:text-[#141413]" />
                  <span>Account Settings</span>
                </button>
              </div>

              <div className="p-2 border-t border-[#d6d3c4]/50">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-3 px-3 py-2 w-full text-left rounded text-xs font-bold text-[#cf3e3e] hover:bg-[#cf3e3e]/10 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Terminate Session</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className={`w-full p-4 flex items-center justify-between hover:bg-[#faf9f5]/5 transition-colors focus:outline-none focus:bg-[#faf9f5]/5 ${!isSidebarOpen && 'flex-col gap-4'}`}
          aria-label="User menu"
        >
          <div className={`flex items-center gap-2.5 overflow-hidden ${!isSidebarOpen && 'justify-center w-full'}`}>
            {isLoaded && userAvatarUrl ? (
              <img src={userAvatarUrl} alt={userName} className="w-8 h-8 rounded object-cover border border-[#141413]/50" />
            ) : (
              <div className="w-8 h-8 shrink-0 rounded bg-[#e8e6dc] flex items-center justify-center font-black text-[#141413] text-xs border border-[#141413]/50">
                {userInitials}
              </div>
            )}

            {isSidebarOpen && (
              <div className="overflow-hidden text-left flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-[#faf9f5] truncate">{userName}</span>
                </div>
                <div className="text-[10px] font-bold text-[#faf9f5]/50 truncate">{userRole === 'ADMIN' ? 'Admin' : userRole === 'MENTOR' ? 'Mentor' : 'Learner'}</div>
              </div>
            )}
          </div>

          {isSidebarOpen && (
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-transform duration-200 text-[#faf9f5]/50 ${isProfileMenuOpen ? 'rotate-180 bg-[#faf9f5]/10 text-[#faf9f5]' : ''}`}>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </button>
      </div>

      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        defaultTab={settingsTab}
      />
    </aside>
  );
}
