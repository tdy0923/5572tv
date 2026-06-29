'use client';

import { useRef, useState } from 'react';

interface UseCorsDetectionOptions {
  directPlaybackEnabled: boolean;
}

export function useCorsDetection({
  directPlaybackEnabled,
}: UseCorsDetectionOptions) {
  const [corsSupport, setCorsSupport] = useState<Map<string, boolean>>(
    new Map(),
  );
  const corsSupportRef = useRef<Map<string, boolean>>(new Map());
  const [playbackMode, setPlaybackMode] = useState<'direct' | 'proxy'>('proxy');
  const [corsStats, setCorsStats] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('live-cors-stats');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return { directCount: 0, proxyCount: 0, totalChecked: 0 };
        }
      }
    }
    return { directCount: 0, proxyCount: 0, totalChecked: 0 };
  });

  const testCORSSupport = async (url: string): Promise<boolean> => {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.startsWith('http:')
    ) {
      corsSupportRef.current.set(url, false);
      setCorsSupport(new Map(corsSupportRef.current));
      return false;
    }

    if (corsSupportRef.current.has(url)) {
      return corsSupportRef.current.get(url)!;
    }

    if (typeof window !== 'undefined') {
      try {
        const cacheKey = `cors-cache-${btoa(url).substring(0, 50)}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { supports, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

          if (age < MAX_AGE) {
            corsSupportRef.current.set(url, supports);
            setCorsSupport(new Map(corsSupportRef.current));
            return supports;
          }
        }
      } catch (error) {
        // 缓存读取失败，继续检测
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);

      const supports = response.ok;

      corsSupportRef.current.set(url, supports);
      setCorsSupport(new Map(corsSupportRef.current));

      if (typeof window !== 'undefined') {
        try {
          const cacheKey = `cors-cache-${btoa(url).substring(0, 50)}`;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              supports,
              timestamp: Date.now(),
              url: url.substring(0, 100),
            }),
          );
        } catch (error) {
          // localStorage 满了或其他错误，忽略
        }
      }

      setCorsStats((prev) => {
        const newStats = {
          directCount: prev.directCount + (supports ? 1 : 0),
          proxyCount: prev.proxyCount + (supports ? 0 : 1),
          totalChecked: prev.totalChecked + 1,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('live-cors-stats', JSON.stringify(newStats));
        }
        return newStats;
      });

      return supports;
    } catch (error) {
      const supports = false;

      corsSupportRef.current.set(url, supports);
      setCorsSupport(new Map(corsSupportRef.current));

      if (typeof window !== 'undefined') {
        try {
          const cacheKey = `cors-cache-${btoa(url).substring(0, 50)}`;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              supports,
              timestamp: Date.now(),
              url: url.substring(0, 100),
            }),
          );
        } catch (e) {
          // ignore
        }
      }

      setCorsStats((prev) => {
        const newStats = {
          directCount: prev.directCount,
          proxyCount: prev.proxyCount + 1,
          totalChecked: prev.totalChecked + 1,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('live-cors-stats', JSON.stringify(newStats));
        }
        return newStats;
      });

      return false;
    }
  };

  const shouldUseDirectPlayback = async (url: string): Promise<boolean> => {
    if (!directPlaybackEnabled) {
      setPlaybackMode('proxy');
      return false;
    }

    const supportsCORS = await testCORSSupport(url);

    if (supportsCORS) {
      setPlaybackMode('direct');
      return true;
    } else {
      setPlaybackMode('proxy');
      return false;
    }
  };

  return {
    corsSupport,
    playbackMode,
    corsStats,
    testCORSSupport,
    shouldUseDirectPlayback,
  };
}
