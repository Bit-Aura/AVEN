'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHackathons,
  getHackathonDetail,
  searchHackathons,
  getUpcomingHackathons,
  getHackathonSources,
  triggerHackathonScrape
} from '../api/client';
import type { HackathonFilters, HackathonListResponse, HackathonEvent } from '@aven/shared-types';

export function useHackathons(filters: HackathonFilters = {}) {
  return useQuery<HackathonListResponse>({
    queryKey: ['hackathons', filters],
    queryFn: () => getHackathons(filters),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useHackathonSearch(query: string, page = 1, page_size = 20) {
  return useQuery<HackathonListResponse>({
    queryKey: ['hackathons', 'search', query, page, page_size],
    queryFn: () => searchHackathons(query, page, page_size),
    enabled: Boolean(query && query.trim().length > 0),
    staleTime: 30 * 1000,
  });
}

export function useUpcomingHackathons(page = 1, page_size = 20) {
  return useQuery<HackathonListResponse>({
    queryKey: ['hackathons', 'upcoming', page, page_size],
    queryFn: () => getUpcomingHackathons(page, page_size),
    staleTime: 60 * 1000,
  });
}

export function useHackathonDetail(id: string) {
  return useQuery<HackathonEvent>({
    queryKey: ['hackathons', 'detail', id],
    queryFn: () => getHackathonDetail(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHackathonSources() {
  return useQuery<{ sources: Array<{ id: string; name: string; description: string }> }>({
    queryKey: ['hackathons', 'sources'],
    queryFn: () => getHackathonSources(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useHackathonScrape() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ source, limit }: { source: string; limit?: number }) =>
      triggerHackathonScrape(source, limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackathons'] });
    },
  });
}
