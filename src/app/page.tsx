import { Suspense } from 'react';

import type { SearchResult, ShortDramaItem } from '@/lib/types';
import type { HomePageData } from '@/hooks/useHomePageQueries';

import { FluentLoadingPage } from '@/components/FluentSpinner';
import { HomeClient } from '@/components/HomeClient';
import MountAnimation from '@/components/MountAnimation';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// 首页 SSR 不再同步等待上游源站：给内部 API 一个短超时，
// 超时立即返回空数据出骨架，水合后由客户端拉取，避免首屏 TTFB 被拖慢
const SSR_FETCH_TIMEOUT = 1500;

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function parseTrending(data: any): {
  movies: SearchResult[];
  tvShows: SearchResult[];
  variety: SearchResult[];
  anime: SearchResult[];
} {
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
}

async function getInitialData(): Promise<HomePageData> {
  const [trendingResult, shortDramaResult] = await Promise.allSettled([
    raceTimeout(
      fetch(`${BASE_URL}/api/trending`, { cache: 'no-store' }).then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('trending failed')),
      ),
      SSR_FETCH_TIMEOUT,
    ),
    raceTimeout(
      fetch(`${BASE_URL}/api/shortdrama/recommend?size=20`, {
        cache: 'no-store',
      }).then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('shortdrama failed')),
      ),
      SSR_FETCH_TIMEOUT,
    ),
  ]);

  let hotMovies: SearchResult[] = [];
  let hotTvShows: SearchResult[] = [];
  let hotVarietyShows: SearchResult[] = [];
  let hotAnime: SearchResult[] = [];
  let hotShortDramas: ShortDramaItem[] = [];

  if (trendingResult.status === 'fulfilled') {
    const { movies, tvShows, variety, anime } = parseTrending(
      trendingResult.value,
    );
    hotMovies = movies;
    hotTvShows = tvShows;
    hotVarietyShows = variety;
    hotAnime = anime;
  }

  if (
    shortDramaResult.status === 'fulfilled' &&
    Array.isArray(shortDramaResult.value)
  ) {
    hotShortDramas = shortDramaResult.value;
  }

  // 🎬 HeroBanner 的 backdrop/trailerUrl 由客户端 heroDetailsQuery 懒加载
  // 服务端不等待豆瓣详情，确保首页快速渲染

  return { hotMovies, hotTvShows, hotVarietyShows, hotAnime, hotShortDramas };
}

export default async function Page() {
  const initialTrendingData = await getInitialData();
  return (
    <MountAnimation>
      <Suspense fallback={<FluentLoadingPage />}>
        <HomeClient initialTrendingData={initialTrendingData} />
      </Suspense>
    </MountAnimation>
  );
}
