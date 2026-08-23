'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export default function RoadmapNoiseChecker() {
  const [isOpen, setIsOpen] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = () => {
    setIsResolving(true);
    setTimeout(() => {
      setIsResolving(false);
      setIsResolved(true);
    }, 1500);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden mt-8 shadow-xl">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex justify-between items-center hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isResolved ? (
            <CheckCircle2 className="text-emerald-500" size={24} />
          ) : (
            <AlertCircle className="text-amber-500" size={24} />
          )}
          <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wide">
            Sanity Check: Path Dependencies
          </h3>
          {!isResolved && (
            <span className="bg-amber-500/20 text-amber-500 text-xs font-bold px-2 py-1 rounded border border-amber-500/50">
              1 Issue Found
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-6 border-t border-slate-700 bg-slate-950/50">
          {!isResolved ? (
            <div className="space-y-6">
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-5">
                <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                  <AlertCircle size={18} />
                  High-Friction Dependency Cycle Detected
                </h4>
                <p className="text-slate-300 text-sm">
                  <span className="font-bold text-white">Warning:</span> 'Advanced K8s Deployment' is scheduled before 'Intro to Docker'. 
                  This creates a logical gap that historically causes a 45% drop-off in completion rates for this module.
                </p>
              </div>

              <button 
                onClick={handleResolve}
                disabled={isResolving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {isResolving ? (
                  <span className="animate-pulse">Reordering Graph...</span>
                ) : (
                  <>
                    <Zap size={18} />
                    Auto-Resolve Dependency Graph
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 text-center">
              <CheckCircle2 className="text-emerald-500 mx-auto mb-3" size={32} />
              <h4 className="text-emerald-400 font-bold mb-2">Graph Optimized</h4>
              <p className="text-slate-300 text-sm">
                'Intro to Docker' has been correctly prioritized. The path is now structurally sound.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
