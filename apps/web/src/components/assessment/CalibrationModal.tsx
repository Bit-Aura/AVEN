'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, X } from 'lucide-react';

export default function CalibrationModal({ 
  skillId, 
  onComplete,
  onClose
}: { 
  skillId: string; 
  onComplete: (confidence: number) => void;
  onClose: () => void;
}) {
  const [confidence, setConfidence] = useState(50);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-aven-text-subtle hover:text-aven-text hover:bg-slate-800 rounded-lg transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 pr-8">
            <Target className="text-aven-primary" size={24} />
            <h2 className="text-xl font-bold text-aven-text">Pre-Assessment Calibration</h2>
          </div>
          <p className="text-aven-text-subtle text-sm mt-2">
            Before we test your knowledge on <span className="text-aven-primary font-semibold">{skillId}</span>, let's calibrate.
          </p>
        </div>

        <div className="p-8">
          <h3 className="text-center text-lg font-medium text-aven-text mb-6">
            How confident are you on this topic?
          </h3>
          
          <div className="flex justify-center mb-8">
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              {confidence}%
            </div>
          </div>

          <div className="relative mb-8">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="10"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-aven-text-muted mt-2 font-medium uppercase tracking-wider">
              <span>Guessing</span>
              <span>Solid</span>
              <span>Expert</span>
            </div>
          </div>

          <button 
            onClick={() => onComplete(confidence)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-aven-text font-bold py-4 rounded-xl transition-colors shadow-lg shadow-indigo-900/20"
          >
            Start Assessment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
