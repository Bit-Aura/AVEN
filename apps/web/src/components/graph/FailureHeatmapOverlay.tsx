'use client';

import { usePathStore } from '../../store/usePathStore';
import { Flame, Info } from 'lucide-react';

export default function FailureHeatmapOverlay() {
  const showHeatmap = usePathStore(state => state.showHeatmap);
  const toggleHeatmap = usePathStore(state => state.toggleHeatmap);

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
      <button 
        onClick={toggleHeatmap}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors shadow-lg ${
          showHeatmap 
            ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-rose-900/20' 
            : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
        }`}
      >
        <Flame size={16} className={showHeatmap ? "animate-pulse" : ""} />
        {showHeatmap ? 'Hide Cognitive Heatmap' : 'Show Cognitive Heatmap'}
      </button>

      {showHeatmap && (
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 shadow-xl backdrop-blur-sm animate-in slide-in-from-top-2 w-64">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
            <Info size={14} className="text-slate-400" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Historical Mistakes</h4>
          </div>
          
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <span className="text-slate-300">High Error Rate (Concurrency)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="text-slate-300">Medium (Boundary Conditions)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              <span className="text-slate-300">Low (Syntax Errors)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
