'use client';

import { usePathStore } from '../store/usePathStore';
import { Terminal, Code, HelpCircle, WifiOff, Focus, X, Command } from 'lucide-react';
import { useEffect } from 'react';

export default function CommandPalette() {
  const isCommandPaletteOpen = usePathStore((state) => state.isCommandPaletteOpen);
  const toggleCommandPalette = usePathStore((state) => state.toggleCommandPalette);
  const closeCommandPalette = usePathStore((state) => state.closeCommandPalette);
  
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const openIde = usePathStore((state) => state.openIde);
  const openCoach = usePathStore((state) => state.openCoach);
  const toggleOffline = usePathStore((state) => state.toggleOffline);
  const toggleFocusMode = usePathStore((state) => state.toggleFocusMode);

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header / Search Mock */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 text-slate-300">
          <Terminal size={20} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Search commands..." 
            className="bg-transparent border-none outline-none w-full text-lg placeholder:text-slate-600"
            autoFocus
          />
          <button onClick={closeCommandPalette} className="hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Commands List */}
        <div className="p-2 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Quick Actions
          </div>
          
          <button 
            onClick={() => { if(activeMilestone) { openIde(activeMilestone.id); closeCommandPalette(); } }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-slate-300 group-hover:text-white">
              <Code size={18} className="text-indigo-400" />
              <span>Open IDE for Active Milestone</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              <Command size={12} /> <span>I</span>
            </div>
          </button>

          <button 
            onClick={() => { if(activeMilestone) { openCoach(activeMilestone.id); closeCommandPalette(); } }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-slate-300 group-hover:text-white">
              <HelpCircle size={18} className="text-pink-400" />
              <span>Ask AI Coach</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              <Command size={12} /> <span>H</span>
            </div>
          </button>

          <button 
            onClick={() => { toggleOffline(); closeCommandPalette(); }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-slate-300 group-hover:text-white">
              <WifiOff size={18} className="text-orange-400" />
              <span>Toggle Offline Mode</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              <Command size={12} /> <span>O</span>
            </div>
          </button>

          <button 
            onClick={() => { toggleFocusMode(); closeCommandPalette(); }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
          >
            <div className="flex items-center gap-3 text-slate-300 group-hover:text-white">
              <Focus size={18} className="text-indigo-400" />
              <span>Toggle Focus Mode</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              <Command size={12} /> <span>F</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
