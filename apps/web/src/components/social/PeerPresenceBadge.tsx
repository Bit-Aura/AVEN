'use client';

import { Users } from 'lucide-react';

export default function PeerPresenceBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-surface-secondary border border-border px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <Users size={13} className="text-brand-400" />
      <span>{count} learners active on this module</span>
    </div>
  );
}
