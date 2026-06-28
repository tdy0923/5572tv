'use client';

/**
 * 首页数据获取 - 使用采集源（非豆瓣）
 */

import { useQueries } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getRecommendedShortDramas } from '@/lib/shortdrama.client';
import { SearchResult, ShortDramaItem } from '@/lib/types';

export interface HomePageData {
  hotMovies: SearchResult[];
  hotTvShows: SearchResult[];
  hotVarietyShows: SearchResult[];
  hotAnime: SearchResult[];
  hotShortDramas: ShortDramaItem[];
}

export interface HomePageQueriesResult {
  data: HomePageData;
  isLoading: boolean;
  isFetching: boolean;
  errors: Error[];
  hasError: boolean;
  refetch: () => void;
}

// 从采集源获取热门内容
async function fetchTrending(): Promise<{
  movies: SearchResult[];
  tvShows: SearchResult[];
  variety: SearchResult[];
  anime: SearchResult[];
}> {
  try {
    const response = await fetch('/api/trending');
    if (!response.ok) throw new Error('获取热门内容失败');
    const data = await response.json();

    const movies: SearchResult[] = [];
    const tvShows: SearchResult[] = [];
    const variety: SearchResult[] = [];
    const anime: SearchResult[] = [];

    for (const group of data.results || []) {
      const items = (group.items || []).map((item: any) => ({
        id: item.vod_id || item.id,
        title: item.vod_name || item.title || item.name,
        poster: item.vod_pic || item.pic || item.poster || '',
        source: group.source,
        source_name: group.sourceName,
        year: item.vod_year || item.year || '',
        rate: item.rate || '',
        episodes: item.vod_play_url ? item.vod_play_url.split('#') : [],
        type_name: item.type_name || '',
      }));

      // 根据类型分类
      const sn = group.sourceName || '';
      const tn = items[0]?.type_name || '';
      if (sn.includes('电影') || tn.includes('电影') || tn.includes('动画')) {
        movies.push(...items);
      } else if (sn.includes('剧集') || tn.includes('电视剧')) {
        tvShows.push(...items);
      } else if (sn.includes('综艺')) {
        variety.push(...items);
      } else if (
        sn.includes('动漫') ||
        sn.includes('新番') ||
        tn.includes('动漫')
      ) {
        anime.push(...items);
      } else {
        movies.push(...items);
      }
    }

    return { movies, tvShows, variety, anime };
  } catch (error) {
    console.error('获取热门内容失败:', error);
    return { movies: [], tvShows: [], variety: [], anime: [] };
  }
}

export function useHomePageQueries(): HomePageQueriesResult {
  const combine = useCallback((results: any[]) => {
    const [
      moviesResult,
      tvResult,
      varietyResult,
      animeResult,
      shortDramaResult,
    ] = results;

    return {
      hotMovies: moviesResult?.data || [],
      hotTvShows: tvResult?.data || [],
      hotVarietyShows: varietyResult?.data || [],
      hotAnime: animeResult?.data || [],
      hotShortDramas: shortDramaResult?.data || [],
    };
  }, []);

  const results = useQueries({
    queries: [
      {
        queryKey: ['trending-movies'],
        queryFn: async () => (await fetchTrending()).movies,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['trending-tv'],
        queryFn: async () => (await fetchTrending()).tvShows,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['trending-variety'],
        queryFn: async () => (await fetchTrending()).variety,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['trending-anime'],
        queryFn: async () => (await fetchTrending()).anime,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['short-dramas'],
        queryFn: () => getRecommendedShortDramas(20),
        staleTime: 5 * 60 * 1000,
      },
    ],
    combine,
  });

  const data = (results as any) || {
    hotMovies: [],
    hotTvShows: [],
    hotVarietyShows: [],
    hotAnime: [],
    hotShortDramas: [],
  };

  return {
    data,
    isLoading: (results as any)?.isLoading ?? true,
    isFetching: (results as any)?.isFetching ?? true,
    errors: (results as any)?.errors || [],
    hasError: (results as any)?.hasError ?? false,
    refetch: (results as any)?.refetch,
  };
}
