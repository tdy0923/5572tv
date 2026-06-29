'use client';

import { useEffect, useState } from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    getSearchHistory().then(setSearchHistory);

    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    deleteSearchHistory,
  };
}
