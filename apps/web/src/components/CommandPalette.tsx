'use client';

import { usePathStore } from '../store/usePathStore';
import { useActivePathQuery } from '../hooks/api/useQueries';
import { Terminal, Code, HelpCircle, WifiOff, Focus, X, Command, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Enterprise-grade implementation of CommandPalette.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function CommandPalette() {
  const isCommandPaletteOpen = usePathStore((state) => state.isCommandPaletteOpen);
  const toggleCommandPalette = usePathStore((state) => state.toggleCommandPalette);
  const closeCommandPalette = usePathStore((state) => state.closeCommandPalette);
  
  const { data: activePathData } = useActivePathQuery();
  const activeMilestone = activePathData?.activeMilestone;
  const nodes = activePathData?.nodes || [];

  const openIde = usePathStore((state) => state.openIde);
  const openCoach = usePathStore((state) => state.openCoach);
  const toggleOffline = usePathStore((state) => state.toggleOffline);
  const toggleFocusMode = usePathStore((state) => state.toggleFocusMode);

  const [search, setSearch] = useState('');

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }

      // Close Palette: Escape
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        closeCommandPalette();
      }

      // Action: Cmd+I (Open IDE)
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        if (activeMilestone) {
          openIde(activeMilestone.id);
          closeCommandPalette();
        }
      }

      // Action: Cmd+H (Open Coach)
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        if (activeMilestone) {
          openCoach(activeMilestone.id);
          closeCommandPalette();
        }
      }

      // Action: Cmd+O (Toggle Offline)
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        toggleOffline();
        closeCommandPalette();
      }

      // Action: Cmd+F (Toggle Focus Mode)
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        toggleFocusMode();
        closeCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    toggleCommandPalette,
    closeCommandPalette,
    activeMilestone,
    openIde,
    openCoach,
    toggleOffline,
    toggleFocusMode,
  ]);

  if (!isCommandPaletteOpen) return null;

  const filteredNodes = nodes.filter(n => {
    const label = (n.data?.label as string) || '';
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header / Search Mock */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 text-aven-text-subtle">
          <Terminal size={20} className="text-aven-text-muted" />
          <input 
            type="text" 
            placeholder="Search commands or skills..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-lg placeholder:text-aven-text-muted"
            autoFocus
          />
          <button onClick={closeCommandPalette} className="hover:text-aven-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Commands List */}
        <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
          {search && filteredNodes.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-aven-text-muted uppercase tracking-wider">
                Skills in Path
              </div>
              {filteredNodes.map(node => (
                <button 
                  key={node.id}
                  onClick={() => {
                    openIde(node.id);
                    closeCommandPalette();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3 text-aven-text-subtle group-hover:text-aven-text">
                    <MapPin size={18} className="text-emerald-400" />
                    <span>Jump to: {(node.data?.label as string) || node.id}</span>
                  </div>
                </button>
              ))}
              <div className="my-2 border-t border-slate-800"></div>
            </>
          )}

          <div className="px-3 py-2 text-xs font-semibold text-aven-text-muted uppercase tracking-wider">
            Quick Actions
          </div>
          
          <button 
            onClick={() => { if(activeMilestone) { openIde(activeMilestone.id); closeCommandPalette(); } }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-aven-text-subtle group-hover:text-aven-text">
              <Code size={18} className="text-aven-primary" />
              <span>Open IDE for Active Milestone</span>
            </div>
            <div className="flex items-center gap-1 text-aven-text-muted text-xs font-mono">
              <Command size={12} /> <span>I</span>
            </div>
          </button>

          <button 
            onClick={() => { if(activeMilestone) { openCoach(activeMilestone.id); closeCommandPalette(); } }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-aven-text-subtle group-hover:text-aven-text">
              <HelpCircle size={18} className="text-pink-400" />
              <span>Ask AI Coach</span>
            </div>
            <div className="flex items-center gap-1 text-aven-text-muted text-xs font-mono">
              <Command size={12} /> <span>H</span>
            </div>
          </button>

          <button 
            onClick={() => { toggleOffline(); closeCommandPalette(); }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-aven-text-subtle group-hover:text-aven-text">
              <WifiOff size={18} className="text-orange-400" />
              <span>Toggle Offline Mode</span>
            </div>
            <div className="flex items-center gap-1 text-aven-text-muted text-xs font-mono">
              <Command size={12} /> <span>O</span>
            </div>
          </button>

          <button 
            onClick={() => { toggleFocusMode(); closeCommandPalette(); }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-aven-text-subtle group-hover:text-aven-text">
              <Focus size={18} className="text-aven-primary" />
              <span>Toggle Focus Mode</span>
            </div>
            <div className="flex items-center gap-1 text-aven-text-muted text-xs font-mono">
              <Command size={12} /> <span>F</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
