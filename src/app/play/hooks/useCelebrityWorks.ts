'use client';

import { useState } from 'react';

import { ClientCache } from '@/lib/client-cache';

export function useCelebrityWorks(
  _currentSource: string,
  _currentId: string,
  _videoTitle: string,
) {
  const [selectedCelebrityName, setSelectedCelebrityName] = useState<
    string | null
  >(null);
  const [celebrityWorks, setCelebrityWorks] = useState<any[]>([]);
  const [loadingCelebrityWorks, setLoadingCelebrityWorks] = useState(false);

  const handleCelebrityClick = async (celebrityName: string) => {
    if (selectedCelebrityName === celebrityName) {
      setSelectedCelebrityName(null);
      setCelebrityWorks([]);
      return;
    }

    setSelectedCelebrityName(celebrityName);
    setLoadingCelebrityWorks(true);
    setCelebrityWorks([]);

    try {
      const cacheKey = `douban-celebrity-${celebrityName}`;
      const cached = await ClientCache.get(cacheKey);

      if (cached) {
        setCelebrityWorks(cached);
        setLoadingCelebrityWorks(false);
        return;
      }

      let works: any[] = [];

      try {
        const response = await fetch(
          `/api/douban/celebrity-works?name=${encodeURIComponent(celebrityName)}&limit=20`,
        );
        const data = await response.json();
        if (data.success && data.works && data.works.length > 0) {
          works = data.works;
          // source = 'douban-search';
        }
      } catch (e) {
        console.warn('豆瓣通用搜索失败:', e);
      }

      if (works.length === 0) {
        try {
          const apiResponse = await fetch(
            `/api/douban/celebrity-works?name=${encodeURIComponent(celebrityName)}&limit=20&mode=api`,
          );
          const apiData = await apiResponse.json();
          if (apiData.success && apiData.works && apiData.works.length > 0) {
            works = apiData.works;
            // source = 'douban-api';
          }
        } catch (e) {
          console.warn('豆瓣API搜索失败:', e);
        }
      }

      if (works.length === 0) {
        try {
          const tmdbResponse = await fetch(
            `/api/tmdb/actor?actor=${encodeURIComponent(celebrityName)}&type=movie&limit=20`,
          );
          const tmdbResult = await tmdbResponse.json();
          if (
            tmdbResult.code === 200 &&
            tmdbResult.list &&
            tmdbResult.list.length > 0
          ) {
            works = tmdbResult.list.map((work: any) => ({
              ...work,
              source: 'tmdb',
            }));
            // source = 'tmdb';
          }
        } catch (e) {
          console.warn('TMDB搜索失败:', e);
        }
      }

      if (works.length > 0) {
        await ClientCache.set(cacheKey, works, 2 * 60 * 60);
        setCelebrityWorks(works);
      } else {
        setCelebrityWorks([]);
      }
    } catch (error) {
      console.error('获取演员作品出错:', error);
      setCelebrityWorks([]);
    } finally {
      setLoadingCelebrityWorks(false);
    }
  };

  return {
    selectedCelebrityName,
    setSelectedCelebrityName,
    celebrityWorks,
    setCelebrityWorks,
    loadingCelebrityWorks,
    handleCelebrityClick,
  };
}
