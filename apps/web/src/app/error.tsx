'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 text-slate-100">
      <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center gap-6 max-w-lg text-center shadow-glass">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-glow-rose">
          <AlertTriangle className="text-rose-400" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Something went wrong</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {error?.message || "The deterministic skill graph engine encountered an unexpected state. Please retry."}
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-glow-indigo transition-all"
        >
          <RefreshCw size={14} />
          <span>Retry Operation</span>
        </button>
      </div>
    </div>
  );
}
