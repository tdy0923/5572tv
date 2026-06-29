'use client';

import { useCallback, useState } from 'react';

import type { TvboxHistoryEntry } from '../types';

const HISTORY_STORAGE_KEY = 'tvbox-history';
const MAX_HISTORY = 50;

function loadHistory(): TvboxHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: TvboxHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

export function useTvboxHistory() {
  const [history, setHistory] = useState<TvboxHistoryEntry[]>(loadHistory);

  const addHistory = useCallback(
    (entry: Omit<TvboxHistoryEntry, 'id' | 'timestamp'>) => {
      const newEntry: TvboxHistoryEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const next = [newEntry, ...prev].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
    },
    [],
  );

  const removeHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
  };
}
