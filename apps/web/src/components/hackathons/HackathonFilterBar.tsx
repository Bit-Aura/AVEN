'use client';

import React from 'react';
import { Search, X, SlidersHorizontal, Heart } from 'lucide-react';
import type { HackathonFilters } from '@/types/hackathons';

interface HackathonFilterBarProps {
  filters: HackathonFilters;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterChange: (newFilters: Partial<HackathonFilters>) => void;
  onClearFilters: () => void;
  sources: Array<{ id: string; name: string }>;
  savedCount?: number;
  showOnlySaved?: boolean;
  onToggleShowSaved?: (show: boolean) => void;
}

/**
 * Enterprise-grade implementation of HackathonFilterBar.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function HackathonFilterBar({
  filters,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onClearFilters,
  sources = [],
  savedCount = 0,
  showOnlySaved = false,
  onToggleShowSaved,
}: HackathonFilterBarProps) {
  const activeSources = Array.isArray(filters.source) ? filters.source : filters.source ? [filters.source] : [];
  const activeMode = filters.mode || '';
  const activeSort = filters.sort || 'newest';
  const activeStatus = filters.status || '';

  const hasActiveFilters = Boolean(
    searchQuery.trim() || activeSources.length > 0 || activeMode || activeStatus || (activeSort && activeSort !== 'newest') || showOnlySaved
  );

  return (
    <div className="space-y-3 font-sans">
      
      {/* Top Tab Bar: All Opportunities vs Saved */}
      {onToggleShowSaved && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleShowSaved(false)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              !showOnlySaved
                ? 'bg-[#141413] text-[#faf9f5] shadow-sm'
                : 'bg-white text-[#3d3d3a] border border-[#141413]/10 hover:bg-[#f5f4ee]'
            }`}
          >
            All Hackathons
          </button>

          <button
            onClick={() => onToggleShowSaved(true)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              showOnlySaved
                ? 'bg-[#141413] text-[#faf9f5] shadow-sm'
                : 'bg-white text-[#3d3d3a] border border-[#141413]/10 hover:bg-[#f5f4ee]'
            }`}
          >
            <Heart size={13} className={showOnlySaved ? 'fill-current text-rose-400' : 'text-rose-600'} />
            <span>Saved ({savedCount})</span>
          </button>
        </div>
      )}

      {/* Main Control Stack */}
      <div className="flex flex-col gap-3">
        {/* Search Field */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87867f]" size={14} />
          <input
            type="text"
            placeholder="Search topics or skills..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-black/10 rounded-lg text-[13px] text-[#141413] placeholder-[#87867f] font-medium focus:outline-none focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#87867f] hover:text-[#141413]"
              aria-label="Clear search query"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Stack */}
        <div className="grid grid-cols-3 gap-2">
          {/* Format / Mode Dropdown */}
          <select
            value={activeMode}
            onChange={(e) => onFilterChange({ mode: e.target.value || undefined, page: 1 })}
            className="w-full bg-white border border-black/5 rounded-lg px-3 py-2 text-[13px] text-[#141413] font-medium focus:outline-none focus:border-black/20 hover:border-black/10 transition-colors shadow-sm cursor-pointer"
          >
            <option value="">All Formats</option>
            <option value="online">Online Sprints</option>
            <option value="onsite">In Person</option>
            <option value="hybrid">Hybrid</option>
          </select>

          {/* Timeline / Status Dropdown */}
          <select
            value={activeStatus}
            onChange={(e) => onFilterChange({ status: e.target.value || undefined, page: 1 })}
            className="w-full bg-white border border-black/5 rounded-lg px-3 py-2 text-[13px] text-[#141413] font-medium focus:outline-none focus:border-black/20 hover:border-black/10 transition-colors shadow-sm cursor-pointer"
          >
            <option value="">All Timelines</option>
            <option value="open">Open now</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Past events</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={activeSort}
            onChange={(e) => onFilterChange({ sort: e.target.value, page: 1 })}
            className="w-full bg-white border border-black/5 rounded-lg px-3 py-2 text-[13px] text-[#141413] font-medium focus:outline-none focus:border-black/20 hover:border-black/10 transition-colors shadow-sm cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="deadline_asc">Sort: Closing Soonest</option>
            <option value="prize_desc">Sort: Highest Prizes</option>
          </select>
        </div>
      </div>

      {/* Active Filter Removable Tags */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-[11px] text-[#87867f] font-semibold flex items-center gap-1">
            <SlidersHorizontal size={12} />
            Filters:
          </span>

          {showOnlySaved && (
            <span className="inline-flex items-center gap-1.5 bg-[#e8e6dc] text-[#141413] border border-[#141413]/10 px-2.5 py-0.5 rounded-lg text-xs font-bold">
              Showing Saved Only
              <button onClick={() => onToggleShowSaved?.(false)} className="hover:text-rose-600">
                <X size={12} />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 bg-[#e8e6dc] text-[#141413] border border-[#141413]/10 px-2.5 py-0.5 rounded-lg text-xs font-bold">
              Query: "{searchQuery}"
              <button onClick={() => onSearchChange('')} className="hover:text-rose-600">
                <X size={12} />
              </button>
            </span>
          )}

          {activeSources.map((src) => (
            <span key={src} className="inline-flex items-center gap-1.5 bg-[#e8e6dc] text-[#141413] border border-[#141413]/10 px-2.5 py-0.5 rounded-lg text-xs font-bold">
              {sources.find((s) => s.id === src)?.name || src}
              <button onClick={() => onFilterChange({ source: activeSources.filter(s => s !== src).length > 0 ? activeSources.filter(s => s !== src) : undefined })} className="hover:text-rose-600">
                <X size={12} />
              </button>
            </span>
          ))}

          {activeMode && (
            <span className="inline-flex items-center gap-1.5 bg-[#e8e6dc] text-[#141413] border border-[#141413]/10 px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize">
              Format: {activeMode === 'online' ? 'Online Sprint' : activeMode}
              <button onClick={() => onFilterChange({ mode: undefined })} className="hover:text-rose-600">
                <X size={12} />
              </button>
            </span>
          )}

          {activeStatus && (
            <span className="inline-flex items-center gap-1.5 bg-[#e8e6dc] text-[#141413] border border-[#141413]/10 px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize">
              Timeline: {activeStatus === 'open' ? 'Open Now' : activeStatus}
              <button onClick={() => onFilterChange({ status: undefined })} className="hover:text-rose-600">
                <X size={12} />
              </button>
            </span>
          )}

          <button
            onClick={() => {
              onClearFilters();
              onToggleShowSaved?.(false);
            }}
            className="text-[11px] font-medium text-[#141413] hover:underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
