'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import type { HackathonEvent } from '@/types/hackathons';

interface HackathonCardProps {
  event: HackathonEvent;
  onSelectDetails: (event: HackathonEvent) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  bentoVariant?: 'standard' | 'hero' | 'wide' | 'tall'; // Kept for backwards compatibility but ignored
  isActive?: boolean;
}

const PLATFORM_DOMAINS: Record<string, string> = {
  devpost: 'devpost.com',
  devfolio: 'devfolio.co',
  unstop: 'unstop.com',
  dorahacks: 'dorahacks.io',
  taikai: 'taikai.network',
  ethglobal: 'ethglobal.com',
};

const formatHumanDeadline = (dateString?: string) => {
  if (!dateString) return { text: 'TBA', color: 'text-[#87867f]' };
  const d = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
  
  if (diffDays < 0) return { text: 'Closed', color: 'text-rose-600 bg-rose-50' };
  if (diffDays === 0) return { text: 'Ends Today', color: 'text-rose-600 bg-rose-50' };
  if (diffDays <= 3) return { text: `Ends in ${diffDays}d`, color: 'text-amber-600 bg-amber-50' };
  return { text: `in ${diffDays}d`, color: 'text-emerald-600 bg-emerald-50' };
};

export default function HackathonCard({
  event,
  onSelectDetails,
  isActive = false,
}: HackathonCardProps) {
  const deadlineInfo = formatHumanDeadline(event.registration_deadline);
  const domain = PLATFORM_DOMAINS[event.source?.toLowerCase()] || `${event.source}.com`;

  return (
    <div 
      onClick={() => onSelectDetails(event)}
      className={`group flex items-start gap-4 p-4 cursor-pointer transition-all border-b border-black/5 last:border-0 rounded-xl ${
        isActive ? 'bg-[#141413] shadow-lg translate-x-2' : 'hover:bg-black/[0.02]'
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
        isActive ? 'bg-white/10' : 'bg-white border border-black/5'
      }`}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={`${event.source} logo`}
          className="w-5 h-5 object-contain"
          onError={(e) => { e.currentTarget.src = `https://logo.clearbit.com/${domain}`; }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className={`font-bold text-[15px] truncate transition-colors ${
          isActive ? 'text-aven-text' : 'text-[#141413] group-hover:text-amber-600'
        }`}>
          {event.title}
        </h3>
        
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${
            isActive ? 'text-aven-text/60' : 'text-[#87867f]'
          }`}>
            {event.source}
          </span>
          
          <div className="w-1 h-1 rounded-full bg-black/10" />
          
          <div className={`flex items-center gap-1 text-[11px] font-bold ${
            isActive ? 'text-amber-400' : 'text-amber-600'
          }`}>
            <Trophy size={12} />
            <span>{event.prize_pool || 'TBD'}</span>
          </div>

          <div className="w-1 h-1 rounded-full bg-black/10" />
          
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
            isActive ? 'text-aven-text bg-white/10' : deadlineInfo.color
          }`}>
            {deadlineInfo.text}
          </span>
        </div>
      </div>
    </div>
  );
}
