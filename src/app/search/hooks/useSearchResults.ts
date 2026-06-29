'use client';

import {
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef } from 'react';

import { SearchResult } from '@/lib/types';
import { resolvePosterUrl } from '@/lib/utils';

import { VideoCardHandle } from '@/components/VideoCard';

import { FilterState } from './useSearchFilters';

export type SSEChunk =
  | { type: 'start'; totalSources: number }
  | { type: 'source_result'; results: SearchResult[] }
  | { type: 'source_progress' }
  | { type: 'source_error' }
  | { type: 'complete'; completedSources: number };

export type StreamedState = {
  results: SearchResult[];
  totalSources: number;
  completedSources: number;
};

const STREAMED_INITIAL: StreamedState = {
  results: [],
  totalSources: 0,
  completedSources: 0,
};

export function eventSourceIterable(
  url: string,
  signal?: AbortSignal,
): AsyncIterable<SSEChunk> {
  return {
    [Symbol.asyncIterator]() {
      type Item =
        | { value: SSEChunk; done: false }
        | { value: undefined; done: true };
      const queue: Item[] = [];
      let waiting: ((item: Item) => void) | null = null;
      let closed = false;

      let pending: SearchResult[] = [];
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      const enqueue = (chunk: SSEChunk) => {
        if (closed) return;
        const item: Item = { value: chunk, done: false };
        if (waiting) {
          const w = waiting;
          waiting = null;
          w(item);
        } else queue.push(item);
      };

      const flushPending = () => {
        flushTimer = null;
        if (pending.length === 0) return;
        enqueue({ type: 'source_result', results: pending });
        pending = [];
      };

      const close = (completedSources?: number) => {
        if (closed) return;
        if (flushTimer !== null) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (pending.length > 0) {
          enqueue({ type: 'source_result', results: pending });
          pending = [];
        }
        if (completedSources !== undefined) {
          enqueue({ type: 'complete', completedSources });
        }
        closed = true;
        const done: Item = { value: undefined, done: true };
        if (waiting) {
          const w = waiting;
          waiting = null;
          w(done);
        } else queue.push(done);
      };

      const es = new EventSource(url);

      es.onmessage = (event) => {
        if (!event.data || closed) return;
        try {
          const payload = JSON.parse(event.data);
          switch (payload.type) {
            case 'start':
              enqueue({
                type: 'start',
                totalSources: payload.totalSources || 0,
              });
              break;
            case 'source_result':
              enqueue({ type: 'source_progress' });
              if (
                Array.isArray(payload.results) &&
                payload.results.length > 0
              ) {
                pending.push(...(payload.results as SearchResult[]));
                if (flushTimer === null) {
                  flushTimer = setTimeout(flushPending, 80);
                }
              }
              break;
            case 'source_error':
              enqueue({ type: 'source_error' });
              break;
            case 'complete':
              try {
                es.close();
              } catch {
                //                 // console.log('Search parse error:', e);
              }
              close(payload.completedSources ?? 0);
              break;
          }
        } catch {
          //           // console.log('Search parse error:', e);
        }
      };

      es.onerror = () => {
        try {
          es.close();
        } catch {
          //           // console.log('Search parse error:', e);
        }
        close();
      };

      signal?.addEventListener('abort', () => {
        try {
          es.close();
        } catch {
          //           // console.log('Search parse error:', e);
        }
        close();
      });

      return {
        next(): Promise<IteratorResult<SSEChunk>> {
          if (queue.length > 0) return Promise.resolve(queue.shift()!);
          if (closed) return Promise.resolve({ value: undefined, done: true });
          return new Promise((resolve) => {
            waiting = resolve;
          });
        },
      };
    },
  };
}

function pickGroupPoster(group: SearchResult[]): string {
  return resolvePosterUrl(...group.map((item) => item.poster));
}

function computeGroupStats(group: SearchResult[]) {
  const episodes = (() => {
    const countMap = new Map<number, number>();
    group.forEach((g) => {
      const len = g.episodes?.length || 0;
      if (len > 0) countMap.set(len, (countMap.get(len) || 0) + 1);
    });
    let max = 0;
    let res = 0;
    countMap.forEach((v, k) => {
      if (v > max) {
        max = v;
        res = k;
      }
    });
    return res;
  })();
  const source_names = Array.from(
    new Set(group.map((g) => g.source_name).filter(Boolean)),
  ) as string[];

  const douban_id = (() => {
    const countMap = new Map<number, number>();
    group.forEach((g) => {
      if (g.douban_id && g.douban_id > 0) {
        countMap.set(g.douban_id, (countMap.get(g.douban_id) || 0) + 1);
      }
    });
    let max = 0;
    let res: number | undefined;
    countMap.forEach((v, k) => {
      if (v > max) {
        max = v;
        res = k;
      }
    });
    return res;
  })();

  return { episodes, source_names, douban_id };
}

interface UseSearchResultsParams {
  trimmedQuery: string;
  searchQuery: string;
  filterAll: FilterState;
  filterAgg: FilterState;
  exactSearch: boolean;
  useFluidSearch: boolean;
  currentQuery: string;
  titleContainsQuery: (title: string, query: string) => boolean;
  compareYear: (a: string, b: string, order: 'none' | 'asc' | 'desc') => number;
}

export function useSearchResults({
  trimmedQuery,
  searchQuery,
  filterAll,
  filterAgg,
  exactSearch,
  useFluidSearch,
  currentQuery,
  titleContainsQuery,
  compareYear,
}: UseSearchResultsParams) {
  const streamedSearchQuery = useQuery<StreamedState>({
    queryKey: ['search', 'streamed', trimmedQuery],
    queryFn: streamedQuery<SSEChunk, StreamedState>({
      streamFn: (ctx) =>
        eventSourceIterable(
          `/api/search/ws?q=${encodeURIComponent(trimmedQuery)}`,
          ctx.signal,
        ),
      refetchMode: 'reset',
      reducer: (acc: StreamedState, chunk: SSEChunk): StreamedState => {
        switch (chunk.type) {
          case 'start':
            return {
              results: [],
              totalSources: chunk.totalSources,
              completedSources: 0,
            };
          case 'source_result':
            return { ...acc, results: acc.results.concat(chunk.results) };
          case 'source_progress':
            return { ...acc, completedSources: acc.completedSources + 1 };
          case 'source_error':
            return { ...acc, completedSources: acc.completedSources + 1 };
          case 'complete':
            return {
              ...acc,
              completedSources: chunk.completedSources || acc.totalSources,
            };
        }
      },
      initialValue: STREAMED_INITIAL,
    }),
    enabled: !!trimmedQuery && useFluidSearch,
    staleTime: 0,
    gcTime: 0,
  });

  const traditionalSearchQuery = useQuery<SearchResult[]>({
    queryKey: ['search', 'traditional', trimmedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
      );
      const data = await res.json();
      return Array.isArray(data.results)
        ? (data.results as SearchResult[])
        : [];
    },
    enabled: !!trimmedQuery && !useFluidSearch,
    staleTime: 0,
    gcTime: 0,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- conditional is intentional, switches between streaming and traditional
  const searchResults: SearchResult[] = useFluidSearch
    ? (streamedSearchQuery.data?.results ?? [])
    : (traditionalSearchQuery.data ?? []);
  const totalSources = useFluidSearch
    ? (streamedSearchQuery.data?.totalSources ?? 0)
    : 1;
  const completedSources = useFluidSearch
    ? (streamedSearchQuery.data?.completedSources ?? 0)
    : traditionalSearchQuery.isSuccess
      ? 1
      : 0;
  const isLoading = useFluidSearch
    ? streamedSearchQuery.isFetching
    : traditionalSearchQuery.isFetching;
  const traditionalSearchError =
    traditionalSearchQuery.error instanceof Error
      ? traditionalSearchQuery.error.message
      : null;

  const aggregatedResults = useMemo(() => {
    const filteredResults = exactSearch
      ? searchResults.filter((item) =>
          titleContainsQuery(item.title, currentQuery),
        )
      : searchResults;

    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = [];

    filteredResults.forEach((item) => {
      const key = `${item.title.replaceAll(' ', '')}-${
        item.year || 'unknown'
      }-${item.episodes.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key) || [];

      if (arr.length === 0) {
        keyOrder.push(key);
      }

      arr.push(item);
      map.set(key, arr);
    });

    return keyOrder.map(
      (key) => [key, map.get(key)!] as [string, SearchResult[]],
    );
  }, [searchResults, exactSearch]);

  const groupRefs = useRef<Map<string, React.RefObject<VideoCardHandle>>>(
    new Map(),
  );
  const groupStatsRef = useRef<
    Map<
      string,
      { douban_id?: number; episodes?: number; source_names: string[] }
    >
  >(new Map());

  const getGroupRef = (key: string) => {
    let ref = groupRefs.current.get(key);
    if (!ref) {
      ref = React.createRef<VideoCardHandle>();
      groupRefs.current.set(key, ref);
    }
    return ref;
  };

  useEffect(() => {
    aggregatedResults.forEach(([mapKey, group]) => {
      const stats = computeGroupStats(group);
      const prev = groupStatsRef.current.get(mapKey);
      if (!prev) {
        groupStatsRef.current.set(mapKey, stats);
        return;
      }
      const ref = groupRefs.current.get(mapKey);
      if (ref && ref.current) {
        if (prev.episodes !== stats.episodes) {
          ref.current.setEpisodes(stats.episodes);
        }
        const prevNames = (prev.source_names || []).join('|');
        const nextNames = (stats.source_names || []).join('|');
        if (prevNames !== nextNames) {
          ref.current.setSourceNames(stats.source_names);
        }
        if (prev.douban_id !== stats.douban_id) {
          ref.current.setDoubanId(stats.douban_id);
        }
        groupStatsRef.current.set(mapKey, stats);
      }
    });
  }, [aggregatedResults]);

  const filterOptions = useMemo(() => {
    const sourcesSet = new Map<string, string>();
    const titlesSet = new Set<string>();
    const yearsSet = new Set<string>();

    searchResults.forEach((item) => {
      if (item.source && item.source_name) {
        sourcesSet.set(item.source, item.source_name);
      }
      if (item.title) titlesSet.add(item.title);
      if (item.year) yearsSet.add(item.year);
    });

    const sourceOptions = [
      { label: '全部来源', value: 'all' },
      ...Array.from(sourcesSet.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ label, value })),
    ];

    const titleOptions = [
      { label: '全部标题', value: 'all' },
      ...Array.from(titlesSet.values())
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ label: t, value: t })),
    ];

    const years = Array.from(yearsSet.values());
    const knownYears = years
      .filter((y) => y !== 'unknown')
      .sort((a, b) => parseInt(b) - parseInt(a));
    const hasUnknown = years.includes('unknown');
    const yearOptions = [
      { label: '全部年份', value: 'all' },
      ...knownYears.map((y) => ({ label: y, value: y })),
      ...(hasUnknown ? [{ label: '未知', value: 'unknown' }] : []),
    ];

    const categoriesAll = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ] as any[];

    const categoriesAgg = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ] as any[];

    return { categoriesAll, categoriesAgg };
  }, [searchResults]);

  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll;

    const exactSearchFiltered = exactSearch
      ? searchResults.filter((item) =>
          titleContainsQuery(item.title, currentQuery),
        )
      : searchResults;

    const filtered = exactSearchFiltered.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (title !== 'all' && item.title !== title) return false;
      if (year !== 'all' && item.year !== year) return false;
      return true;
    });

    if (yearOrder === 'none') {
      const q = currentQuery.trim();
      return filtered.slice().sort((a, b) => {
        const aExact = (a.title || '').trim() === q;
        const bExact = (b.title || '').trim() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aNum = Number.parseInt(a.year as any, 10);
        const bNum = Number.parseInt(b.year as any, 10);
        const aValid = !Number.isNaN(aNum);
        const bValid = !Number.isNaN(bNum);
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;
        if (aValid && bValid) return bNum - aNum;
        return 0;
      });
    }

    return filtered.sort((a, b) => {
      const yearComp = compareYear(a.year, b.year, yearOrder);
      if (yearComp !== 0) return yearComp;
      const aExactMatch = a.title === searchQuery.trim();
      const bExactMatch = b.title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      return yearOrder === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    });
  }, [searchResults, filterAll, searchQuery, exactSearch]);

  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg as any;
    const filtered = aggregatedResults.filter(([_, group]) => {
      const gTitle = group[0]?.title ?? '';
      const gYear = group[0]?.year ?? 'unknown';
      const hasSource =
        source === 'all' ? true : group.some((item) => item.source === source);
      if (!hasSource) return false;
      if (title !== 'all' && gTitle !== title) return false;
      if (year !== 'all' && gYear !== year) return false;
      return true;
    });

    if (yearOrder === 'none') {
      const q = currentQuery.trim();
      return filtered.slice().sort((a, b) => {
        const aTitle = (a[1][0]?.title || '').trim();
        const bTitle = (b[1][0]?.title || '').trim();
        const aExact = aTitle === q;
        const bExact = bTitle === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aNum = Number.parseInt(a[1][0]?.year as any, 10);
        const bNum = Number.parseInt(b[1][0]?.year as any, 10);
        const aValid = !Number.isNaN(aNum);
        const bValid = !Number.isNaN(bNum);
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;
        if (aValid && bValid) return bNum - aNum;
        return 0;
      });
    }

    return filtered.sort((a, b) => {
      const aYear = a[1][0].year;
      const bYear = b[1][0].year;
      const yearComp = compareYear(aYear, bYear, yearOrder);
      if (yearComp !== 0) return yearComp;
      const aExactMatch = a[1][0].title === searchQuery.trim();
      const bExactMatch = b[1][0].title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      const aTitle = a[1][0].title;
      const bTitle = b[1][0].title;
      return yearOrder === 'asc'
        ? aTitle.localeCompare(bTitle)
        : bTitle.localeCompare(aTitle);
    });
  }, [aggregatedResults, filterAgg, searchQuery]);

  return {
    searchResults,
    totalSources,
    completedSources,
    isLoading,
    traditionalSearchError,
    aggregatedResults,
    computeGroupStats,
    pickGroupPoster,
    groupRefs,
    groupStatsRef,
    getGroupRef,
    filterOptions,
    filteredAllResults,
    filteredAggResults,
  };
}
