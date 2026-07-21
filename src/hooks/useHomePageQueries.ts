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

/**
 * 获取 HeroBanner items 的豆瓣详情（backdrop 横图 + trailerUrl + 剧情简介）
 * 独立缓存 30 分钟，不会被 trending refetch 覆盖
 */
async function fetchHeroDetails(
  topItems: { id: string }[],
): Promise<
  Record<string, { backdrop: string; trailerUrl: string; plot_summary: string }>
> {
  const result: Record<
    string,
    { backdrop: string; trailerUrl: string; plot_summary: string }
  > = {};

  const details = await Promise.allSettled(
    topItems.map(async (item) => {
      try {
        const res = await fetch(`/api/douban/details?id=${item.id}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.code === 200 && data.data) {
          return {
            id: item.id,
            backdrop: data.data.backdrop || '',
            trailerUrl: data.data.trailerUrl || '',
            plot_summary: data.data.plot_summary || '',
          };
        }
      } catch {
        // ignore
      }
      return null;
    }),
  );

  for (const r of details) {
    if (r.status === 'fulfilled' && r.value) {
      result[r.value.id] = r.value;
    }
  }
  return result;
}

/**
 * 将 heroDetails 合并到 trending items 中
 */
function mergeHeroDetails(
  items: SearchResult[],
  heroDetails: Record<
    string,
    { backdrop: string; trailerUrl: string; plot_summary: string }
  >,
): SearchResult[] {
  if (!heroDetails || Object.keys(heroDetails).length === 0) return items;
  return items.map((item) => {
    const detail = heroDetails[item.id];
    if (!detail) return item;
    return {
      ...item,
      backdrop: detail.backdrop || item.backdrop,
      trailerUrl: detail.trailerUrl || item.trailerUrl,
      plot_summary: detail.plot_summary || item.plot_summary,
    };
  });
}

export function useHomePageQueries(
  initialData?: HomePageData,
): HomePageQueriesResult {
  const trendingQuery = useQuery({
    queryKey: ['trending-homepage'],
    queryFn: fetchTrending,
    staleTime: 2 * 60 * 1000,
    initialData: initialData
      ? {
          movies: initialData.hotMovies,
          tvShows: initialData.hotTvShows,
          variety: initialData.hotVarietyShows,
          anime: initialData.hotAnime,
        }
      : undefined,
  });

  const shortDramaQuery = useQuery({
    queryKey: ['short-dramas-homepage'],
    queryFn: () => getRecommendedShortDramas(20),
    staleTime: 5 * 60 * 1000,
    initialData: initialData?.hotShortDramas,
  });

  // 🎬 HeroBanner 详情独立缓存：30 分钟 staleTime
  // 客户端懒加载：页面先渲染海报，后台获取横图后自动更新
  const trending = trendingQuery.data || {
    movies: [],
    tvShows: [],
    variety: [],
    anime: [],
  };

  const heroTopItems = [
    ...trending.movies.slice(0, 2),
    ...trending.tvShows.slice(0, 2),
    ...trending.variety.slice(0, 1),
  ];

  const heroDetailsQuery = useQuery({
    queryKey: ['hero-details', heroTopItems.map((i) => i.id).join(',')],
    queryFn: () => fetchHeroDetails(heroTopItems),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const mergedMovies = mergeHeroDetails(trending.movies, heroDetailsQuery.data);
  const mergedTvShows = mergeHeroDetails(
    trending.tvShows,
    heroDetailsQuery.data,
  );
  const mergedVariety = mergeHeroDetails(
    trending.variety,
    heroDetailsQuery.data,
  );

  const data: HomePageData = {
    hotMovies: mergedMovies,
    hotTvShows: mergedTvShows,
    hotVarietyShows: mergedVariety,
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
