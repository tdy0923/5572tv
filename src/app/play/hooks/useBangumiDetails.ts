'use client';
import { useEffect, useRef, useState } from 'react';

import { ClientCache } from '@/lib/client-cache';

const BANGUMI_CACHE_EXPIRE = 4 * 60 * 60 * 1000;

const isBangumiId = (id: number): boolean => {
  const length = id.toString().length;
  return id > 0 && length >= 3 && length <= 6;
};

const getBangumiCache = async (id: number) => {
  try {
    const cacheKey = `bangumi-details-${id}`;
    const cached = await ClientCache.get(cacheKey);
    if (cached) return cached;

    if (typeof localStorage !== 'undefined') {
      const localCached = localStorage.getItem(cacheKey);
      if (localCached) {
        const { data, expire } = JSON.parse(localCached);
        if (Date.now() <= expire) {
          return data;
        }
        localStorage.removeItem(cacheKey);
      }
    }

    return null;
  } catch (_e) {
    return null;
  }
};

const setBangumiCache = async (id: number, data: any) => {
  try {
    const cacheKey = `bangumi-details-${id}`;
    const expireSeconds = Math.floor(BANGUMI_CACHE_EXPIRE / 1000);

    await ClientCache.set(cacheKey, data, expireSeconds);

    if (typeof localStorage !== 'undefined') {
      try {
        const cacheData = {
          data,
          expire: Date.now() + BANGUMI_CACHE_EXPIRE,
          created: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (e) {
        // localStorage may be full
      }
    }
  } catch (_e) {
    // cache write failed
  }
};

const fetchBangumiDetails = async (bangumiId: number) => {
  const cached = await getBangumiCache(bangumiId);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `/api/proxy/bangumi?path=v0/subjects/${bangumiId}`,
    );
    if (response.ok) {
      const bangumiData = await response.json();
      await setBangumiCache(bangumiId, bangumiData);
      return bangumiData;
    }
  } catch {
    // fetch failed
  }
  return null;
};

export function useBangumiDetails(videoDoubanId: number, source?: string) {
  const [bangumiDetails, setBangumiDetails] = useState<any>(null);
  const loadingBangumiRef = useRef(false);
  const [loadingBangumiDetails, setLoadingBangumiDetails] = useState(false);

  useEffect(() => {
    if (!videoDoubanId || videoDoubanId === 0 || source === 'shortdrama') {
      return;
    }

    if (!isBangumiId(videoDoubanId)) return;
    if (bangumiDetails) return;
    if (loadingBangumiRef.current) return;
    loadingBangumiRef.current = true;

    let cancelled = false;
    setLoadingBangumiDetails(true); // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch
    fetchBangumiDetails(videoDoubanId)
      .then((data) => {
        if (!cancelled && data) setBangumiDetails(data);
      })
      .catch(() => {
        // fetch failed
      })
      .finally(() => {
        if (!cancelled) setLoadingBangumiDetails(false);
        loadingBangumiRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [videoDoubanId, bangumiDetails, source]);

  return { bangumiDetails, loadingBangumiDetails };
}
