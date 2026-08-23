'use client';

import { Handle, Position } from '@xyflow/react';
import { usePathStore } from '../store/usePathStore';
import { Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SkillNode({ data, id }: { data: any; id: string }) {
  const isSimulatingSkip = usePathStore((state) => state.isSimulatingSkip);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const showHeatmap = usePathStore((state) => state.showHeatmap);

  // Determine node state based on simulation
  // For the sake of UI prototyping, if we are simulating skip on the active milestone,
  // we consider it 'skipped' and the next node 'blocked'.
  const isSkipped = isSimulatingSkip && activeMilestone?.id === id;
  // If it's a downstream node, let's just mock it based on id not being the active one
  // or pass down via data
  const isBlocked = isSimulatingSkip && activeMilestone?.id !== id && parseInt(id.replace('node-','')) > parseInt(activeMilestone?.id.replace('node-','') || '0');
  const isCompleted = data.status === 'completed';

  // Mock heatmap error rate logic based on node id
  let heatmapClass = "";
  if (showHeatmap) {
    const numId = parseInt(id.replace('node-','')) || 0;
    if (numId % 3 === 0) {
      heatmapClass = " bg-rose-950/40 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse";
    } else if (numId % 2 === 0) {
      heatmapClass = " bg-orange-950/40 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]";
    } else {
      heatmapClass = " bg-yellow-950/20 border-yellow-500/50";
    }
  }

  let containerClass = "px-4 py-2 rounded-lg border-2 shadow-md transition-all duration-300 min-w-[150px] bg-slate-800 text-slate-200 border-slate-600";
  
  if (showHeatmap) {
     containerClass = `px-4 py-2 rounded-lg border-2 transition-all duration-300 min-w-[150px] text-slate-200 ${heatmapClass}`;
  } else if (isSkipped) {
    // Cross-hatch pattern CSS is usually done with repeating-linear-gradient
    containerClass = "px-4 py-2 rounded-lg border-2 shadow-md transition-all duration-300 min-w-[150px] border-slate-700 opacity-50";
  } else if (isBlocked) {
    containerClass = "px-4 py-2 rounded-lg border-2 shadow-md transition-all duration-300 min-w-[150px] bg-slate-900 border-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]";
  } else if (isCompleted) {
    containerClass = "px-4 py-2 rounded-lg border-2 shadow-md transition-all duration-300 min-w-[150px] bg-emerald-900/30 border-emerald-500 text-emerald-200";
  }

  return (
    <div 
      className={containerClass}
      style={isSkipped ? {
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.5) 5px, rgba(0,0,0,0.5) 10px)'
      } : {}}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-500" />
      
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-1">
          {isBlocked && <AlertTriangle size={14} className="text-amber-500" />}
          {isCompleted && <CheckCircle2 size={14} className="text-emerald-400" />}
          {!isBlocked && !isCompleted && !isSkipped && <Lock size={14} className="text-slate-400" />}
          <span className="font-bold text-sm text-center">{data.label}</span>
        </div>
        {isBlocked && (
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded">
            Blocked Dependency
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-500" />
    </div>
  );
}
