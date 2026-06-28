'use client';

import { useQuery } from '@tanstack/react-query';

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
  const trendingQuery = useQuery({
    queryKey: ['trending-homepage'],
    queryFn: fetchTrending,
    staleTime: 2 * 60 * 1000,
  });

  const shortDramaQuery = useQuery({
    queryKey: ['short-dramas-homepage'],
    queryFn: () => getRecommendedShortDramas(20),
    staleTime: 5 * 60 * 1000,
  });

  const trending = trendingQuery.data || {
    movies: [],
    tvShows: [],
    variety: [],
    anime: [],
  };

  const data: HomePageData = {
    hotMovies: trending.movies,
    hotTvShows: trending.tvShows,
    hotVarietyShows: trending.variety,
    hotAnime: trending.anime,
    hotShortDramas: shortDramaQuery.data || [],
  };

  const isLoading = trendingQuery.isLoading || shortDramaQuery.isLoading;
  const isFetching = trendingQuery.isFetching || shortDramaQuery.isFetching;
  const errors = [trendingQuery.error, shortDramaQuery.error].filter(
    Boolean,
  ) as Error[];

  return {
    data,
    isLoading,
    isFetching,
    errors,
    hasError: errors.length > 0,
    refetch: () => {
      trendingQuery.refetch();
      shortDramaQuery.refetch();
    },
  };
}
