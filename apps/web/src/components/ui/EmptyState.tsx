'use client';

import { Inbox } from 'lucide-react';

export default function EmptyState({ 
  message, 
  actionText, 
  onAction 
}: { 
  message: string; 
  actionText?: string; 
  onAction?: () => void; 
}) {
  return (
    <div className="bg-aven-base border border-aven-border border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center shadow-glass">
      <div className="w-12 h-12 rounded-xl bg-aven-surface flex items-center justify-center text-aven-text-muted">
        <Inbox size={24} />
      </div>
      <h3 className="text-base font-bold text-aven-text uppercase tracking-wider">No Data Available</h3>
      <p className="text-xs text-aven-text-subtle max-w-sm leading-relaxed">{message}</p>
      {actionText && onAction && (
        <button 
          onClick={onAction} 
          className="mt-2 bg-brand-600 hover:bg-brand-500 text-aven-text font-bold text-xs px-5 py-2.5 rounded-xl shadow-glow-indigo transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
