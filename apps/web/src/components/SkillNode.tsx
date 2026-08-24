'use client';

import { Handle, Position } from '@xyflow/react';
import { usePathStore } from '../store/usePathStore';
import { Lock, AlertTriangle, CheckCircle2, Sparkles, Flame } from 'lucide-react';

export default function SkillNode({ data, id }: { data: any; id: string }) {
  const isSimulatingSkip = usePathStore((state) => state.isSimulatingSkip);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const showHeatmap = usePathStore((state) => state.showHeatmap);
  const openIde = usePathStore((state) => state.openIde);

  const isCurrentActive = data.status === 'active' || activeMilestone?.id === id;
  const isCompleted = data.status === 'completed';
  const isSkipped = isSimulatingSkip && activeMilestone?.id === id;

  let containerClass = "px-4 py-3 rounded-xl border transition-all duration-300 min-w-[170px] bg-surface-secondary/80 text-slate-300 border-border shadow-card cursor-pointer hover:border-slate-500";
  
  if (showHeatmap) {
    containerClass = "px-4 py-3 rounded-xl border transition-all duration-300 min-w-[170px] bg-rose-950/30 border-rose-500/50 text-rose-200 shadow-glow-rose";
  } else if (isSkipped) {
    containerClass = "px-4 py-3 rounded-xl border transition-all duration-300 min-w-[170px] bg-slate-900/50 border-slate-700 text-slate-500 opacity-50";
  } else if (isCompleted) {
    containerClass = "px-4 py-3 rounded-xl border transition-all duration-300 min-w-[170px] bg-emerald-950/30 border-emerald-500/50 text-emerald-200 shadow-glow-emerald";
  } else if (isCurrentActive) {
    containerClass = "px-4 py-3 rounded-xl border-2 transition-all duration-300 min-w-[170px] bg-brand-500/10 border-brand-500 text-white shadow-glow-indigo animate-pulse";
  }

  return (
    <div 
      className={containerClass}
      onClick={() => isCurrentActive && openIde(id)}
      style={isSkipped ? {
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.5) 5px, rgba(0,0,0,0.5) 10px)'
      } : {}}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-slate-500 !border-surface" />
      
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-2">
          {isCompleted && <CheckCircle2 size={15} className="text-emerald-400" />}
          {isCurrentActive && <Sparkles size={15} className="text-brand-400" />}
          {!isCompleted && !isCurrentActive && !isSkipped && <Lock size={13} className="text-slate-500" />}
          <span className="font-bold text-xs md:text-sm text-center tracking-tight">
            {data.label}
          </span>
        </div>

        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          isCompleted 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : isCurrentActive 
            ? 'bg-brand-500/20 text-brand-300' 
            : 'bg-surface text-slate-500'
        }`}>
          {isCompleted ? 'Mastered' : isCurrentActive ? 'Active Focus' : 'Locked'}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-slate-500 !border-surface" />
    </div>
  );
}
