'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, Loader2, RotateCcw, Heart, Sparkles } from 'lucide-react';
import { useSafeUser } from '../../../../lib/clerkSafe';
import {
  useHackathons,
  useHackathonSearch,
  useHackathonSources,
  useHackathonScrape
} from '../../../../hooks/useHackathons';
import { useSavedHackathons } from '../../../../hooks/useSavedHackathons';
import PlatformMiniSelector from '../../../../components/hackathons/PlatformMiniSelector';
import HackathonFilterBar from '../../../../components/hackathons/HackathonFilterBar';
import HackathonCard from '../../../../components/hackathons/HackathonCard';
import HackathonSkeleton from '../../../../components/hackathons/HackathonSkeleton';
import HackathonDetailModal from '../../../../components/hackathons/HackathonDetailModal';
import type { HackathonEvent, HackathonFilters } from '@aven/shared-types';

export default function HackathonRadarPage() {
  const { user } = useSafeUser();
  const userRole = (user?.role || 'LEARNER').toUpperCase();
  const isAdminOrMentor = userRole === 'ADMIN' || userRole === 'MENTOR';

  // Saved items state
  const { savedIds, toggleSave, isSaved } = useSavedHackathons();
  const [showOnlySaved, setShowOnlySaved] = useState(false);

  // Filter state
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<HackathonFilters>({
    sort: 'newest',
  });
  const [selectedEvent, setSelectedEvent] = useState<HackathonEvent | null>(null);

  const limit = 12;

  // Build API filters object
  const activeFilters: HackathonFilters = useMemo(
    () => ({
      ...filters,
      page,
      page_size: limit,
    }),
    [filters, page, limit]
  );

  // Data fetching hooks
  const { data: hackathonData, isLoading, isError, refetch } = useHackathons(activeFilters);
  const { data: searchData, isLoading: isSearching } = useHackathonSearch(searchQuery, page, limit);
  const { data: sourcesData } = useHackathonSources();
  const scrapeMutation = useHackathonScrape();

  // Extract raw events array
  const rawEvents: HackathonEvent[] = useMemo(() => {
    if (searchQuery.trim()) {
      return searchData?.events || (searchData as any)?.data || [];
    }
    return hackathonData?.events || (hackathonData as any)?.data || [];
  }, [searchQuery, searchData, hackathonData]);

  const totalEvents: number = useMemo(() => {
    if (searchQuery.trim()) {
      return searchData?.total ?? (searchData as any)?.count ?? 0;
    }
    return hackathonData?.total ?? (hackathonData as any)?.count ?? 0;
  }, [searchQuery, searchData, hackathonData]);

  // Apply saved items filter locally if active
  const displayedEvents = useMemo(() => {
    if (!showOnlySaved) return rawEvents;
    return rawEvents.filter((ev) => isSaved(`${ev.source}-${ev.external_id}`));
  }, [rawEvents, showOnlySaved, isSaved]);

  const pageCount = Math.max(1, Math.ceil(totalEvents / limit));

  const handleFilterChange = (newFilters: Partial<HackathonFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({ sort: 'newest' });
    setShowOnlySaved(false);
    setPage(1);
  };

  const handleRefreshEvents = async () => {
    try {
      await scrapeMutation.mutateAsync({ source: 'all', limit: 20 });
      refetch();
    } catch {
      // Handled cleanly by react-query
    }
  };

  const activeSourceId = Array.isArray(filters.source) ? filters.source[0] : filters.source || '';

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#141413] p-4 md:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto font-sans antialiased">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#141413]/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#141413]">
              Hackathon Radar
            </h1>
            <span className="text-xs font-bold text-[#87867f] bg-[#f5f4ee] px-2.5 py-0.5 rounded-full border border-[#141413]/10">
              {isLoading || isSearching ? 'Loading...' : `${totalEvents} events`}
            </span>
          </div>
          <p className="text-xs text-[#87867f] font-medium mt-1">
            Find upcoming hackathons, AI sprints, and coding challenges across 10 developer platforms.
          </p>
        </div>

        {isAdminOrMentor && (
          <button
            onClick={handleRefreshEvents}
            disabled={scrapeMutation.isPending}
            title="Refresh hackathon listings"
            className="px-4 py-2 rounded-xl bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 active:scale-95 self-start sm:self-auto shrink-0"
            aria-label="Refresh events"
          >
            {scrapeMutation.isPending ? (
              <Loader2 size={14} className="animate-spin text-amber-400" />
            ) : (
              <RefreshCw size={14} />
            )}
            <span>Refresh Events</span>
          </button>
        )}
      </div>

      {/* 2. Compact Platform Mini-Selector Grid */}
      <PlatformMiniSelector
        selectedSource={activeSourceId}
        onSelectSource={(sourceId) => handleFilterChange({ source: sourceId || undefined })}
        events={rawEvents}
      />

      {/* 3. Filter Bar & Saved Switcher */}
      <HackathonFilterBar
        filters={filters}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        sources={sourcesData?.sources || []}
        savedCount={savedIds.length}
        showOnlySaved={showOnlySaved}
        onToggleShowSaved={(show) => setShowOnlySaved(show)}
      />

      {/* 4. Hackathon Cards Grid */}
      {isLoading || isSearching ? (
        <HackathonSkeleton count={6} />
      ) : isError ? (
        <div className="py-12 text-center bg-white border border-rose-200 rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-black text-[#141413]">Unable to load hackathons right now</h3>
          <p className="text-xs text-[#87867f]">Please check your network connection and try again.</p>
          <button
            onClick={() => refetch()}
            className="text-xs font-bold bg-[#141413] text-[#faf9f5] px-4 py-2 rounded-xl"
          >
            Try Again
          </button>
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="py-16 text-center bg-white border border-[#141413]/10 rounded-2xl p-8 space-y-3 shadow-sm">
          {showOnlySaved ? (
            <>
              <Heart size={28} className="mx-auto text-[#87867f]" />
              <h3 className="text-base font-black text-[#141413]">No saved hackathons yet</h3>
              <p className="text-xs text-[#87867f] max-w-sm mx-auto">
                Click the heart icon on any hackathon card to save it for quick access later.
              </p>
              <button
                onClick={() => setShowOnlySaved(false)}
                className="text-xs font-bold bg-[#141413] text-[#faf9f5] px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 uppercase tracking-wider"
              >
                Browse All Hackathons
              </button>
            </>
          ) : (
            <>
              <Sparkles size={28} className="mx-auto text-[#87867f]" />
              <h3 className="text-base font-black text-[#141413]">No hackathons match these filters</h3>
              <p className="text-xs text-[#87867f] max-w-sm mx-auto">
                Try adjusting your search terms, clearing selected platforms, or resetting filters.
              </p>
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 uppercase tracking-wider"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedEvents.map((event, idx) => {
            const eventId = `${event.source}-${event.external_id}`;
            return (
              <HackathonCard
                key={`${eventId}-${idx}`}
                event={event}
                onSelectDetails={(ev) => setSelectedEvent(ev)}
                isSaved={isSaved(eventId)}
                onToggleSave={toggleSave}
              />
            );
          })}
        </div>
      )}

      {/* 5. Pagination Controls */}
      {!showOnlySaved && pageCount > 1 && (
        <div className="flex items-center justify-between bg-white border border-[#141413]/10 p-4 rounded-2xl shadow-sm text-xs font-bold text-[#87867f]">
          <div>
            Page {page} of {pageCount} ({totalEvents} hackathons)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3.5 py-1.5 rounded-xl bg-[#f5f4ee] text-[#141413] hover:bg-[#e8e6dc] disabled:opacity-40 transition-colors border border-[#141413]/5 font-black uppercase text-[11px]"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="px-3.5 py-1.5 rounded-xl bg-[#f5f4ee] text-[#141413] hover:bg-[#e8e6dc] disabled:opacity-40 transition-colors border border-[#141413]/5 font-black uppercase text-[11px]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* 6. Detail Inspection Modal */}
      <HackathonDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
