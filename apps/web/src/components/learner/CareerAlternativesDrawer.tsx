'use client';

import { useState } from 'react';
import { Briefcase, ArrowRight, X, Sparkles, RefreshCw } from 'lucide-react';

export default function CareerAlternativesDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [selectedPivot, setSelectedPivot] = useState<string | null>(null);

  const alternatives = [
    {
      id: 'data-engineer',
      role: 'Data Engineer',
      match: 72,
      salvagedSkills: 18,
      totalSkills: 25,
      description: 'Your strong Python and SQL foundation makes this a highly efficient pivot.'
    },
    {
      id: 'devops',
      role: 'DevOps Engineer',
      match: 65,
      salvagedSkills: 15,
      totalSkills: 23,
      description: 'Leverage your backend architecture knowledge into infrastructure.'
    },
    {
      id: 'fullstack',
      role: 'Full Stack Developer',
      match: 61,
      salvagedSkills: 20,
      totalSkills: 33,
      description: 'Add frontend skills to your existing backend mastery.'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <RefreshCw className="text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Considering a Pivot?</h2>
              <p className="text-sm text-slate-400">Salvage your hard-earned skills.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Sparkles className="text-indigo-400 flex-shrink-0" size={20} />
              <p className="text-sm text-slate-300">
                You've completed <span className="font-bold text-white">25 skills</span> for Backend Engineering. 
                Here are alternative roles that reuse more than 60% of your progress.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {alternatives.map((alt) => (
              <div 
                key={alt.id}
                onClick={() => setSelectedPivot(alt.id)}
                className={`p-5 border rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedPivot === alt.id 
                    ? 'bg-slate-800 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Briefcase size={16} className="text-slate-400" />
                    {alt.role}
                  </h3>
                  <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                    {alt.match}% Match
                  </span>
                </div>
                
                <p className="text-sm text-slate-400 mb-4">{alt.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>Skills Salvaged</span>
                    <span>{alt.salvagedSkills} / {alt.totalSkills}</span>
                  </div>
                  
                  {/* Visual Comparison Bar */}
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-indigo-500"
                      style={{ width: `${(alt.salvagedSkills / alt.totalSkills) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-slate-600"
                      style={{ width: `${100 - ((alt.salvagedSkills / alt.totalSkills) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-950/50">
          <button 
            disabled={!selectedPivot}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview Path Details
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
