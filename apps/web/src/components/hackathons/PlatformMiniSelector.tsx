'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { HackathonEvent } from '@aven/shared-types';

interface PlatformSource {
  id: string;
  name: string;
  domain: string;
  monogram: string;
}

const PLATFORMS: PlatformSource[] = [
  { id: 'devfolio', name: 'Devfolio', domain: 'devfolio.co', monogram: 'DF' },
  { id: 'unstop', name: 'Unstop', domain: 'unstop.com', monogram: 'US' },
  { id: 'devpost', name: 'Devpost', domain: 'devpost.com', monogram: 'DP' },
  { id: 'hackerearth', name: 'HackerEarth', domain: 'hackerearth.com', monogram: 'HE' },
  { id: 'hack2skill', name: 'Hack2Skill', domain: 'hack2skill.com', monogram: 'H2S' },
  { id: 'hackculture', name: 'HackCulture', domain: 'hackculture.com', monogram: 'HC' },
  { id: 'hackquest', name: 'HackQuest', domain: 'hackquest.io', monogram: 'HQ' },
  { id: 'lablab', name: 'LabLab.ai', domain: 'lablab.ai', monogram: 'LL' },
  { id: 'mlh', name: 'MLH League', domain: 'mlh.io', monogram: 'MLH' },
  { id: 'whereuelevate', name: 'Where U Elevate', domain: 'whereuelevate.com', monogram: 'WUE' },
];

interface PlatformMiniSelectorProps {
  selectedSource: string;
  onSelectSource: (sourceId: string) => void;
  events: HackathonEvent[];
}

export default function PlatformMiniSelector({
  selectedSource,
  onSelectSource,
  events = [],
}: PlatformMiniSelectorProps) {
  // Derive live counts per source platform from events list
  const sourceStats = React.useMemo(() => {
    const stats: Record<string, { total: number; closingSoon: number }> = {};
    events.forEach((ev) => {
      const src = (ev.source || '').toLowerCase();
      if (!stats[src]) stats[src] = { total: 0, closingSoon: 0 };
      stats[src].total += 1;
      if (ev.registration_deadline) {
        const diff = new Date(ev.registration_deadline.replace('Z', '+00:00')).getTime() - Date.now();
        if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) {
          stats[src].closingSoon += 1;
        }
      }
    });
    return stats;
  }, [events]);

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#87867f]">
          Ecosystem Hubs
        </span>
        {selectedSource && (
          <button
            onClick={() => onSelectSource('')}
            className="text-[10px] font-black text-[#141413] hover:underline"
          >
            Show All Platforms
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedSource === platform.id;
          const stat = sourceStats[platform.id] || { total: 0, closingSoon: 0 };

          // Build live human subtitle
          let subtitle = 'Explore';
          if (stat.total > 0) {
            if (stat.closingSoon > 0) {
              subtitle = `${stat.closingSoon} closing soon`;
            } else {
              subtitle = `${stat.total} open now`;
            }
          }

          return (
            <button
              key={platform.id}
              onClick={() => onSelectSource(isSelected ? '' : platform.id)}
              className={`group p-2.5 rounded-2xl flex items-center gap-2.5 text-left transition-all duration-200 w-full ${
                isSelected
                  ? 'bg-[#141413] text-[#faf9f5] border border-[#141413] shadow-md scale-[1.02]'
                  : 'bg-white text-[#141413] border border-[#141413]/10 hover:border-[#141413]/30 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Monogram / Icon Tile */}
              <div
                className={`w-8 h-8 rounded-xl border flex shrink-0 items-center justify-center font-black text-[11px] transition-colors ${
                  isSelected
                    ? 'bg-[#3d3d3a] border-white/20 text-[#faf9f5]'
                    : 'bg-[#f5f4ee] border-[#141413]/10 text-[#141413]'
                }`}
              >
                {platform.monogram}
              </div>

              {/* Platform Info */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`text-xs font-black tracking-tight truncate ${
                    isSelected ? 'text-[#faf9f5]' : 'text-[#141413]'
                  }`}
                >
                  {platform.name}
                </h4>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider truncate block ${
                    isSelected ? 'text-amber-400 font-black' : 'text-[#87867f]'
                  }`}
                >
                  {subtitle}
                </span>
              </div>

              {/* Hover Action Arrow */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ${
                  isSelected ? 'bg-[#faf9f5] text-[#141413]' : 'bg-[#141413] text-[#faf9f5]'
                }`}
              >
                <ArrowRight size={10} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
