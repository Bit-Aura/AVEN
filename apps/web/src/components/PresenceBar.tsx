'use client';

import { usePathStore } from '../store/usePathStore';
import { Users } from 'lucide-react';

export default function PresenceBar() {
  const collaborators = usePathStore((state) => state.collaborators);

  // We only want to show other users, not "You" in the live presence bar usually, 
  // but for MVP demonstration, we will show all online collaborators.
  const onlineCollaborators = collaborators.filter(c => c.isOnline);

  if (onlineCollaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-in fade-in zoom-in">
      <div className="flex items-center gap-2 text-slate-400 border-r border-slate-700 pr-3">
        <Users size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">Live</span>
      </div>
      
      <div className="flex -space-x-2 overflow-hidden">
        {onlineCollaborators.map((collaborator) => (
          <div 
            key={collaborator.id} 
            className={`relative inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 ${collaborator.color} flex items-center justify-center text-white text-xs font-bold shadow-md cursor-help group transition-transform hover:scale-110 hover:z-10`}
            title={collaborator.name}
          >
            {collaborator.name.charAt(0)}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-slate-900 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            
            {/* Tooltip */}
            <div className="absolute top-10 hidden group-hover:block whitespace-nowrap bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-600 shadow-xl z-50">
              {collaborator.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
