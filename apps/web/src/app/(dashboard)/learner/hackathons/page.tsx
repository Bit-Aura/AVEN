'use client';

import { useState, useMemo, useEffect } from 'react';
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
import HackathonRow from '../../../../components/hackathons/HackathonRow';
import HackathonSkeleton from '../../../../components/hackathons/HackathonSkeleton';
import HackathonDetailModal from '../../../../components/hackathons/HackathonDetailModal';
import HackathonDetailPane from '../../../../components/hackathons/HackathonDetailPane';
import { HackathonFilters } from '../../../../api/client';

import type { HackathonEvent } from '@/types/hackathons';

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

  // Auto-select first event for the Detail Pane
  useEffect(() => {
    if (displayedEvents.length > 0) {
      const isSelectedStillValid = selectedEvent && displayedEvents.some(
        ev => ev.external_id === selectedEvent.external_id && ev.source === selectedEvent.source
      );
      if (!isSelectedStillValid) {
        setSelectedEvent(displayedEvents[0]);
      }
    } else {
      setSelectedEvent(null);
    }
  }, [displayedEvents, selectedEvent]);

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

  const activeSources = Array.isArray(filters.source) ? filters.source : filters.source ? [filters.source] : [];

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#141413] p-4 md:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto font-sans antialiased">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.04]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-medium tracking-tight text-[#141413]">
              Hackathon Radar
            </h1>
            <span className="text-[11px] font-medium text-[#87867f] bg-black/[0.03] px-2.5 py-1 rounded-full">
              {isLoading || isSearching ? 'Loading...' : `${totalEvents} events`}
            </span>
          </div>
          <p className="text-sm text-[#87867f] mt-1.5">
            Find upcoming hackathons, AI sprints, and coding challenges across 10 developer platforms.
          </p>
        </div>

        {isAdminOrMentor && (
          <button
            onClick={handleRefreshEvents}
            disabled={scrapeMutation.isPending}
            title="Refresh hackathon listings"
            className="px-3.5 py-1.5 rounded-lg bg-white border border-black/5 hover:border-black/10 hover:bg-black/[0.02] text-[#141413] text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98] self-start sm:self-auto shrink-0 shadow-sm"
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

      {/* Layout: Split-Pane Master/Detail */}
      <div className="flex flex-col lg:flex-row gap-6 items-start relative mt-4">
        
        {/* Left Master List */}
        <aside className="w-full lg:w-[45%] xl:w-[40%] shrink-0 space-y-6">
          
          {/* Sticky Filter Block (Only search/dropdowns) */}
          <div className="sticky top-6 z-20 bg-[#faf9f5]/95 backdrop-blur-md p-5 border border-black/[0.04] shadow-sm rounded-2xl">
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
          </div>

          {/* Scrollable Content (Platforms + List) */}
          <div className="space-y-6">
            <div>
              <PlatformMiniSelector
                selectedSources={activeSources}
                onSelectSources={(sourceIds) => handleFilterChange({ source: sourceIds.length > 0 ? sourceIds : undefined })}
                events={rawEvents}
              />
            </div>

          {/* Dense List of Rows */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black uppercase text-[#87867f] tracking-wider">
                Events ({totalEvents})
              </h3>
            </div>
            {isLoading || isSearching ? (
              <HackathonSkeleton count={6} />
            ) : isError ? (
              <div className="py-16 text-center text-[#141413]">
                <h3 className="text-sm font-medium">Unable to load hackathons</h3>
                <p className="text-sm text-[#87867f] mt-1 mb-4">Please check your network connection.</p>
                <button
                  onClick={() => refetch()}
                  className="text-xs font-medium bg-white border border-black/5 hover:bg-black/[0.02] text-[#141413] px-4 py-2 rounded-lg shadow-sm"
                >
                  Try Again
                </button>
              </div>
            ) : displayedEvents.length === 0 ? (
              <div className="py-16 text-center">
                <Sparkles size={24} className="mx-auto text-[#87867f] mb-3" />
                <h3 className="text-sm font-medium text-[#141413]">No hackathons found</h3>
                <p className="text-sm text-[#87867f] mt-1 mb-5">Try adjusting your search terms.</p>
                <button onClick={handleClearFilters} className="text-xs font-medium bg-white border border-black/5 px-4 py-2 rounded-lg inline-flex items-center gap-2">
                  <RotateCcw size={13} /> Reset Filters
                </button>
              </div>
            ) : (
              displayedEvents.map((event, idx) => {
                const eventId = `${event.source}-${event.external_id}`;
                return (
                  <HackathonRow
                    key={`${eventId}-${idx}`}
                    event={event}
                    isSelected={selectedEvent?.external_id === event.external_id}
                    onSelect={(ev) => setSelectedEvent(ev)}
                  />
                );
              })
            )}
          </div>

          {/* 5. Pagination Controls */}
          {!showOnlySaved && pageCount > 1 && (
            <div className="flex items-center justify-between py-4 text-xs font-medium text-[#87867f]">
              <div>Page {page} of {pageCount}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-black/5 hover:bg-black/[0.02] text-[#141413] disabled:opacity-40 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => { setPage((p) => Math.min(pageCount, p + 1)); window.scrollTo(0, 0); }}
                  disabled={page >= pageCount}
                  className="px-3 py-1.5 rounded-lg bg-white border border-black/5 hover:bg-black/[0.02] text-[#141413] disabled:opacity-40 transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </div>
        </aside>

        {/* Right Detail Canvas (Sticky) */}
        <main className="hidden lg:block flex-1 sticky top-6 h-[calc(100vh-48px)] min-w-0">
          <HackathonDetailPane event={selectedEvent} />
        </main>
      </div>

      {/* Mobile Detail Modal (Only visible on small screens) */}
      <div className="lg:hidden">
        <HackathonDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </div>
  );
}
