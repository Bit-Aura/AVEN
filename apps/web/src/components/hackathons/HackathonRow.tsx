import React from 'react';
import type { HackathonEvent } from '@/types/hackathons';

interface HackathonRowProps {
  event: HackathonEvent;
  isSelected: boolean;
  onSelect: (event: HackathonEvent) => void;
}

const PLATFORM_DOMAINS: Record<string, string> = {
  devfolio: 'devfolio.co',
  devpost: 'devpost.com',
  unstop: 'unstop.com',
  hack2skill: 'hack2skill.com',
  hackerearth: 'hackerearth.com',
  hackquest: 'hackquest.io',
  lablab: 'lablab.ai',
  mlh: 'mlh.io',
  whereuelevate: 'whereuelevate.com',
  hackculture: 'hackculture.com',
  dorahacks: 'dorahacks.io',
  ethglobal: 'ethglobal.com',
  taikai: 'taikai.network',
};

const CUSTOM_LOGOS: Record<string, string> = {
  'hackquest.io': '/platforms/hackquest.png',
  'hackculture.com': '/platforms/hackculture.png',
};

// Human-friendly deadline formatter
function formatHumanDeadline(deadlineIso?: string | null): { text: string; color: string; isUrgent: boolean } {
  if (!deadlineIso) return { text: 'Open for registration', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', isUrgent: false };
  try {
    const cleanStr = deadlineIso.replace('Z', '+00:00');
    const deadline = new Date(cleanStr);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) return { text: 'Past deadline', color: 'bg-stone-100 text-stone-600 border-stone-200', isUrgent: false };

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0) {
      return { text: `Closes in ${hours}h`, color: 'bg-amber-50 text-amber-900 border-amber-300', isUrgent: true };
    }
    if (days === 1) {
      return { text: 'Closes tomorrow', color: 'bg-amber-50 text-amber-900 border-amber-300', isUrgent: true };
    }
    if (days <= 7) {
      return { text: `${days} days left`, color: 'bg-amber-50 text-amber-900 border-amber-300', isUrgent: true };
    }

    const dayName = deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { text: `Apply by ${dayName}`, color: 'bg-emerald-50 text-emerald-800 border-emerald-200', isUrgent: false };
  } catch {
    return { text: 'Open for registration', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', isUrgent: false };
  }
}

export default function HackathonRow({ event, isSelected, onSelect }: HackathonRowProps) {
  const deadlineInfo = formatHumanDeadline(event.registration_deadline);
  const domain = PLATFORM_DOMAINS[event.source?.toLowerCase()] || `${event.source}.com`;

  return (
    <div
      onClick={() => onSelect(event)}
      className={`group flex items-center justify-between gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden ${
        isSelected
          ? 'bg-white shadow-md ring-1 ring-black/10'
          : 'hover:bg-white/60 hover:shadow-sm border border-transparent hover:border-black/5'
      }`}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#141413] rounded-l-xl" />
      )}
      <div className={`flex items-center gap-3 min-w-0 ${isSelected ? 'pl-2' : ''}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#f5f4ee]' : 'bg-white border border-black/5 group-hover:bg-[#f5f4ee]'}`}>
          <img
            src={CUSTOM_LOGOS[domain] || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
            alt={`${event.source} logo`}
            className="w-5 h-5 object-contain"
            onError={(e) => {
              const fallbackUrl = `https://icon.horse/icon/${domain}`;
              if (e.currentTarget.src !== fallbackUrl) {
                e.currentTarget.src = fallbackUrl;
              } else {
                e.currentTarget.style.display = 'none';
              }
            }}
          />
        </div>
        
        <div className="flex flex-col min-w-0">
          <h4 className={`text-[13px] font-bold truncate ${isSelected ? 'text-[#141413]' : 'text-[#3d3d3a] group-hover:text-[#141413]'}`}>
            {event.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-medium text-[#87867f] flex-wrap">
            <span className="capitalize">{event.source}</span>
            {event.mode && (
              <>
                <span className="w-1 h-1 rounded-full bg-black/20" />
                <span className="capitalize">{event.mode === 'online' ? 'Online' : 'In person'}</span>
              </>
            )}
            {event.prize_pool && (
              <>
                <span className="w-1 h-1 rounded-full bg-black/20" />
                <span className="text-amber-600 font-semibold">{event.prize_pool}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border whitespace-nowrap ${
          isSelected ? 'bg-black/5 border-transparent text-[#141413]' : deadlineInfo.color
        }`}>
          {deadlineInfo.text}
        </span>
      </div>
    </div>
  );
}
