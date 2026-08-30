import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Per-route loading skeleton for learner sub-pages (graph, interview, simulator, etc.).
 * Shows immediately during page transitions, giving instant visual feedback
 * instead of a blank screen while the JS bundle and data load.
 */
export default function Loading() {
  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] bg-aven-base flex items-center justify-center -m-6 md:-m-8">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={28} className="text-aven-primary animate-spin" />
        <div className="text-xs font-bold uppercase tracking-widest text-aven-text-subtle">
          Loading Module
        </div>
      </div>
    </div>
  );
}
