'use client';

import React from 'react';
import type { HackathonEvent } from '@aven/shared-types';

interface PlatformSource {
  id: string;
  name: string;
  domain: string;
}

const PLATFORMS: PlatformSource[] = [
  { id: 'devfolio', name: 'Devfolio', domain: 'devfolio.co' },
  { id: 'unstop', name: 'Unstop', domain: 'unstop.com' },
  { id: 'devpost', name: 'Devpost', domain: 'devpost.com' },
  { id: 'hackerearth', name: 'HackerEarth', domain: 'hackerearth.com' },
  { id: 'hack2skill', name: 'Hack2Skill', domain: 'hack2skill.com' },
  { id: 'hackculture', name: 'HackCulture', domain: 'hackculture.com' },
  { id: 'hackquest', name: 'HackQuest', domain: 'hackquest.io' },
  { id: 'lablab', name: 'LabLab', domain: 'lablab.ai' },
  { id: 'mlh', name: 'MLH League', domain: 'mlh.io' },
  { id: 'whereuelevate', name: 'Where U Elevate', domain: 'whereuelevate.com' },
];

interface PlatformMiniSelectorProps {
  selectedSources: string[];
  onSelectSources: (sourceIds: string[]) => void;
  events: any[];
}

const CUSTOM_LOGOS: Record<string, string> = {
  'hackquest.io': '/platforms/hackquest.png',
  'hackculture.com': '/platforms/hackculture.png',
};

export default function PlatformMiniSelector({
  selectedSources = [],
  onSelectSources,
  events = [],
}: PlatformMiniSelectorProps) {
  // Use global sources data instead of paginated events array
  const sourceStats = React.useMemo(() => {
    const stats: Record<string, { total: number }> = {};
    events.forEach((s) => {
      const src = (s.source || "").toLowerCase(); if (!stats[src]) stats[src] = { total: 0 }; stats[src].total += 1;
    });
    return stats;
  }, [events]);

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-[#87867f]">
          Supported Platforms
        </h2>
        {selectedSources.length > 0 && (
          <button
            onClick={() => onSelectSources([])}
            className="text-[10px] font-bold text-[#141413] hover:underline uppercase tracking-wide"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pb-2">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedSources.includes(platform.id);
          const stat = sourceStats[platform.id] || { total: 0 };

          let subtitle = 'Explore';
          if (stat.total > 0) {
            subtitle = `${stat.total} open`;
          }

          return (
            <button
              key={platform.id}
              onClick={() => { if (isSelected) { onSelectSources(selectedSources.filter(id => id !== platform.id)); } else { onSelectSources([...selectedSources, platform.id]); } }}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0 transition-all duration-200 outline-none border ${
                isSelected
                  ? 'bg-white border-[#141413] shadow-sm'
                  : 'bg-white/60 hover:bg-white border-transparent hover:border-[#141413]/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex shrink-0 items-center justify-center transition-colors bg-white shadow-sm border border-black/5`}
              >
                <img
                  src={CUSTOM_LOGOS[platform.domain] || `https://www.google.com/s2/favicons?domain=${platform.domain}&sz=64`}
                  alt={`${platform.name} logo`}
                  className="w-3.5 h-3.5 object-contain"
                  onError={(e) => {
                    const fallbackUrl = `https://icon.horse/icon/${platform.domain}`;
                    if (e.currentTarget.src !== fallbackUrl) {
                      e.currentTarget.src = fallbackUrl;
                    } else {
                      e.currentTarget.style.display = 'none';
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold leading-none ${isSelected ? 'text-[#141413]' : 'text-[#3d3d3a] group-hover:text-[#141413]'}`}>
                  {platform.name}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none ${
                  isSelected ? 'bg-black/10 text-[#141413]' : 'bg-black/5 text-[#87867f]'
                }`}>
                  {subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
