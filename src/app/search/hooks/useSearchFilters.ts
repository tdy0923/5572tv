'use client';

import { useState } from 'react';
import stcasc from 'switch-chinese';

export type FilterState = {
  source: string;
  title: string;
  year: string;
  yearOrder: 'none' | 'asc' | 'desc';
};

const DEFAULT_FILTER: FilterState = {
  source: 'all',
  title: 'all',
  year: 'all',
  yearOrder: 'none',
};

const chineseConverter = stcasc();

const loadInitialFilters = () => {
  if (typeof window === 'undefined')
    return {
      virtualization: true,
      viewMode: 'agg' as const,
      displayMode: 'card' as const,
    };
  try {
    const virtualization = localStorage.getItem('useVirtualization');
    const aggregate = localStorage.getItem('defaultAggregateSearch');
    const displayMode = localStorage.getItem('searchResultDisplayMode');
    return {
      virtualization:
        virtualization !== null ? JSON.parse(virtualization) : true,
      viewMode:
        aggregate !== null
          ? JSON.parse(aggregate)
            ? ('agg' as const)
            : ('all' as const)
          : ('agg' as const),
      displayMode: (displayMode === 'list' ? 'list' : 'card') as
        | 'card'
        | 'list',
    };
  } catch {
    return {
      virtualization: true,
      viewMode: 'agg' as const,
      displayMode: 'card' as const,
    };
  }
};

export function useSearchFilters() {
  const initial = loadInitialFilters();
  const [exactSearch, setExactSearch] = useState(true);
  const [useVirtualization, setUseVirtualization] = useState(
    initial.virtualization,
  );
  const [viewMode, setViewMode] = useState<'agg' | 'all'>(initial.viewMode);
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'list'>(
    initial.displayMode,
  );
  const [filterAll, setFilterAll] = useState<FilterState>(DEFAULT_FILTER);
  const [filterAgg, setFilterAgg] = useState<FilterState>(DEFAULT_FILTER);
  const [expandedSourceTags, setExpandedSourceTags] = useState<
    Record<string, boolean>
  >({});
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  const toggleVirtualization = () => {
    const newValue = !useVirtualization;
    setUseVirtualization(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useVirtualization', JSON.stringify(newValue));
    }
  };

  const compareYear = (
    aYear: string,
    bYear: string,
    order: 'none' | 'asc' | 'desc',
  ) => {
    if (order === 'none') return 0;
    const aIsEmpty = !aYear || aYear === 'unknown';
    const bIsEmpty = !bYear || bYear === 'unknown';
    if (aIsEmpty && bIsEmpty) return 0;
    if (aIsEmpty) return 1;
    if (bIsEmpty) return -1;
    const aNum = parseInt(aYear, 10);
    const bNum = parseInt(bYear, 10);
    return order === 'asc' ? aNum - bNum : bNum - aNum;
  };

  const titleContainsQuery = (title: string, query: string): boolean => {
    if (!exactSearch) return true;
    if (!query || !title) return true;

    const normalizedTitle = title.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    if (normalizedTitle.includes(normalizedQuery)) return true;

    if (chineseConverter.detect(normalizedQuery) === 1) {
      const simplifiedQuery = chineseConverter.simplized(normalizedQuery);
      return normalizedTitle.includes(simplifiedQuery);
    }

    return false;
  };

  return {
    exactSearch,
    setExactSearch,
    useVirtualization,
    setUseVirtualization,
    toggleVirtualization,
    viewMode,
    setViewMode,
    resultDisplayMode,
    setResultDisplayMode,
    filterAll,
    setFilterAll,
    filterAgg,
    setFilterAgg,
    expandedSourceTags,
    setExpandedSourceTags,
    previewImage,
    setPreviewImage,
    compareYear,
    titleContainsQuery,
  };
}
