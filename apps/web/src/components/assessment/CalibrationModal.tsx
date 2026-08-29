'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, X } from 'lucide-react';

/**
 * Enterprise-grade implementation of CalibrationModal.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
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
    <div className="fixed inset-0 bg-aven-text/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-aven-base border border-aven-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 relative" style={{ fontFamily: 'Inter, sans-serif' }}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-aven-text-muted hover:text-aven-text hover:bg-aven-surface rounded-lg transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-6 border-b border-aven-border bg-aven-surface/40">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-aven-surface border border-aven-border flex items-center justify-center shrink-0">
              <Target className="text-aven-primary" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-aven-text tracking-tight">Pre-Assessment Calibration</h2>
              <p className="text-aven-text-muted text-xs font-medium mt-0.5">
                Before testing your knowledge on <span className="text-aven-primary font-bold bg-aven-surface px-1.5 py-0.5 rounded border border-aven-border">{skillId}</span>, calibrate your confidence.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-center text-sm font-bold uppercase tracking-wider text-aven-text-muted mb-4">
            How confident are you on this topic?
          </h3>
          
          <div className="flex justify-center mb-8">
            <div className="text-5xl font-black text-aven-primary tracking-tight">
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
              className="w-full h-2.5 bg-aven-surface border border-aven-border rounded-lg appearance-none cursor-pointer accent-aven-primary"
            />
            <div className="flex justify-between text-[11px] text-aven-text-muted mt-2 font-bold uppercase tracking-wider">
              <span>Guessing</span>
              <span>Solid</span>
              <span>Expert</span>
            </div>
          </div>

          <button 
            onClick={() => onComplete(confidence)}
            className="w-full bg-aven-primary hover:bg-aven-primary/90 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
          >
            Start Assessment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
