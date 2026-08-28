'use client';

import React from 'react';
import { Search, X, SlidersHorizontal, Heart } from 'lucide-react';
import type { HackathonFilters } from '@aven/shared-types';

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

export default function HackathonFilterBar({
  filters,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onClearFilters,
  sources,
  savedCount = 0,
  showOnlySaved = false,
  onToggleShowSaved,
}: HackathonFilterBarProps) {
  const activeSource = Array.isArray(filters.source) ? filters.source[0] : filters.source || '';
  const activeMode = filters.mode || '';
  const activeSort = filters.sort || 'newest';
  const activeStatus = filters.status || '';

  const hasActiveFilters = Boolean(
    searchQuery.trim() || activeSource || activeMode || activeStatus || (activeSort && activeSort !== 'newest') || showOnlySaved
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

      {/* Main Single-Row Control Bar */}
      <div className="bg-white border border-[#141413]/10 rounded-2xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-sm">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87867f]" size={15} />
          <input
            type="text"
            placeholder="Search by topic, skill, or platform (e.g. AI, Python, Devfolio)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-[#f5f4ee] border border-[#141413]/10 rounded-xl text-xs text-[#141413] placeholder-[#87867f] font-medium focus:outline-none focus:border-[#141413] transition-colors"
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

        {/* Filter Dropdowns Group */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {/* Source Dropdown */}
          <select
            value={activeSource}
            onChange={(e) => onFilterChange({ source: e.target.value || undefined, offset: 0 })}
            className="bg-[#f5f4ee] border border-[#141413]/10 rounded-xl px-3 py-2.5 text-xs text-[#141413] font-bold focus:outline-none focus:border-[#141413] cursor-pointer"
          >
            <option value="">All Platforms</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Format / Mode Dropdown */}
          <select
            value={activeMode}
            onChange={(e) => onFilterChange({ mode: e.target.value || undefined, offset: 0 })}
            className="bg-[#f5f4ee] border border-[#141413]/10 rounded-xl px-3 py-2.5 text-xs text-[#141413] font-bold focus:outline-none focus:border-[#141413] cursor-pointer"
          >
            <option value="">All Formats</option>
            <option value="online">Online Sprints</option>
            <option value="onsite">In Person</option>
            <option value="hybrid">Hybrid</option>
          </select>

          {/* Timeline / Status Dropdown */}
          <select
            value={activeStatus}
            onChange={(e) => onFilterChange({ status: e.target.value || undefined, offset: 0 })}
            className="bg-[#f5f4ee] border border-[#141413]/10 rounded-xl px-3 py-2.5 text-xs text-[#141413] font-bold focus:outline-none focus:border-[#141413] cursor-pointer"
          >
            <option value="">All Timelines</option>
            <option value="open">Open now</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Past events</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={activeSort}
            onChange={(e) => onFilterChange({ sort: e.target.value, offset: 0 })}
            className="bg-[#f5f4ee] border border-[#141413]/10 rounded-xl px-3 py-2.5 text-xs text-[#141413] font-bold focus:outline-none focus:border-[#141413] cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="deadline_asc">Sort: Closing Soonest</option>
            <option value="prize_desc">Sort: Highest Prizes</option>
          </select>
        </div>
      </div>

      {/* Active Filter Removable Tags */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#87867f] px-1">
          <span className="text-[11px] text-[#87867f] uppercase font-black tracking-wider flex items-center gap-1">
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

          {activeSource && (
            <span className="inline-flex items-center gap-1.5 bg-[#e8e6dc] text-[#141413] border border-[#141413]/10 px-2.5 py-0.5 rounded-lg text-xs font-bold">
              Platform: {sources.find((s) => s.id === activeSource)?.name || activeSource}
              <button onClick={() => onFilterChange({ source: undefined })} className="hover:text-rose-600">
                <X size={12} />
              </button>
            </span>
          )}

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
            className="text-xs font-bold text-[#141413] hover:underline ml-2 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
