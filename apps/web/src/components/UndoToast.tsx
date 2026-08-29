'use client';

import { usePathStore } from '../store/usePathStore';
import { RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Enterprise-grade implementation of UndoToast.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function UndoToast() {
  const showUndoToast = usePathStore((state) => state.showUndoToast);
  const hideUndoToast = usePathStore((state) => state.hideUndoToast);
  const undoLastAction = usePathStore((state) => state.undoLastAction);

  useEffect(() => {
    if (showUndoToast) {
      // Auto-hide after 5 seconds if not clicked
      const timer = setTimeout(() => {
        hideUndoToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showUndoToast, hideUndoToast]);

  if (!showUndoToast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-lg p-3 pr-2 flex items-center gap-4">
        
        <div className="flex flex-col">
          <span className="text-aven-text text-sm font-medium">Milestone Completed</span>
          <span className="text-aven-text-subtle text-xs">Accidentally marked?</span>
        </div>

        <button 
          onClick={undoLastAction}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-aven-text text-xs font-bold py-1.5 px-3 rounded transition-colors"
        >
          <RotateCcw size={14} />
          UNDO
        </button>

        <button 
          onClick={hideUndoToast}
          className="text-aven-text-muted hover:text-aven-text-subtle ml-1 p-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
