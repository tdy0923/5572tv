'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoRefreshOptions {
  onRefreshRef: React.MutableRefObject<(() => void) | null>;
}

export function useAutoRefresh({ onRefreshRef }: UseAutoRefreshOptions) {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('live-auto-refresh-enabled');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('live-auto-refresh-interval');
      return saved ? parseInt(saved) : 30;
    }
    return 30;
  });
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setupAutoRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (autoRefreshEnabled) {
      const intervalMs = autoRefreshInterval * 60 * 1000;
      autoRefreshTimerRef.current = setInterval(() => {
        onRefreshRef.current?.();
      }, intervalMs);
    }
  }, [autoRefreshEnabled, autoRefreshInterval, onRefreshRef]);

  // Setup timer and cleanup
  useEffect(() => {
    setupAutoRefresh();
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [setupAutoRefresh]);

  // Persist enabled to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'live-auto-refresh-enabled',
        JSON.stringify(autoRefreshEnabled),
      );
    }
  }, [autoRefreshEnabled]);

  // Persist interval to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'live-auto-refresh-interval',
        autoRefreshInterval.toString(),
      );
    }
  }, [autoRefreshInterval]);

  return {
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    autoRefreshInterval,
    setAutoRefreshInterval,
  };
}
