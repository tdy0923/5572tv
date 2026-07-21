import { Suspense } from 'react';

import type { SearchResult, ShortDramaItem } from '@/lib/types';
import type { HomePageData } from '@/hooks/useHomePageQueries';

import { HomeClient } from '@/components/HomeClient';
import MountAnimation from '@/components/MountAnimation';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function getInitialData(): Promise<HomePageData> {
  const [trendingRes, shortDramaRes] = await Promise.all([
    fetch(`${BASE_URL}/api/trending`, { cache: 'no-store' }),
    fetch(`${BASE_URL}/api/shortdrama/recommend?size=20`, {
      cache: 'no-store',
    }),
  ]);

  const hotMovies: SearchResult[] = [];
  const hotTvShows: SearchResult[] = [];
  const hotVarietyShows: SearchResult[] = [];
  const hotAnime: SearchResult[] = [];

  if (trendingRes.ok) {
    const data = await trendingRes.json();
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
        hotMovies.push(...items);
      } else if (sn.includes('剧集') || tn.includes('电视剧')) {
        hotTvShows.push(...items);
      } else if (sn.includes('综艺')) {
        hotVarietyShows.push(...items);
      } else if (
        sn.includes('动漫') ||
        sn.includes('新番') ||
        tn.includes('动漫')
      ) {
        hotAnime.push(...items);
      } else {
        hotMovies.push(...items);
      }
    }
  }

  let hotShortDramas: ShortDramaItem[] = [];
  if (shortDramaRes.ok) {
    const shortData = await shortDramaRes.json();
    hotShortDramas = Array.isArray(shortData) ? shortData : [];
  }

  // 🎬 为 HeroBanner 的 top items 获取豆瓣详情（backdrop 横图 + trailerUrl）
  const heroItems = [
    ...hotMovies.slice(0, 2),
    ...hotTvShows.slice(0, 2),
    ...hotVarietyShows.slice(0, 1),
  ];

  const heroDetails = await Promise.allSettled(
    heroItems.map(async (item) => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/douban/details?id=${item.id}`,
          { cache: 'no-store' },
        );
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

  // 合并 backdrop 和 trailerUrl 到对应 items
  const heroDetailMap = new Map<
    string,
    { backdrop: string; trailerUrl: string; plot_summary: string }
  >();
  for (const result of heroDetails) {
    if (result.status === 'fulfilled' && result.value) {
      heroDetailMap.set(String(result.value.id), result.value);
    }
  }

  for (const item of hotMovies.slice(0, 2)) {
    const detail = heroDetailMap.get(String(item.id));
    if (detail) {
      item.backdrop = detail.backdrop;
      item.trailerUrl = detail.trailerUrl;
      item.plot_summary = detail.plot_summary;
    }
  }
  for (const item of hotTvShows.slice(0, 2)) {
    const detail = heroDetailMap.get(String(item.id));
    if (detail) {
      item.backdrop = detail.backdrop;
      item.trailerUrl = detail.trailerUrl;
      item.plot_summary = detail.plot_summary;
    }
  }
  for (const item of hotVarietyShows.slice(0, 1)) {
    const detail = heroDetailMap.get(String(item.id));
    if (detail) {
      item.backdrop = detail.backdrop;
      item.trailerUrl = detail.trailerUrl;
      item.plot_summary = detail.plot_summary;
    }
  }

  return { hotMovies, hotTvShows, hotVarietyShows, hotAnime, hotShortDramas };
}

export default async function Page() {
  const initialTrendingData = await getInitialData();
  return (
    <MountAnimation>
      <Suspense
        fallback={
          <div className='flex min-h-[400px] flex-col items-center justify-center gap-4'>
            <div className='w-9 h-9 rounded-full border-2 border-gray-200 border-t-primary-500 animate-spin' />
            <p
              className='text-sm font-medium'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              加载中...
            </p>
          </div>
        }
      >
        <HomeClient initialTrendingData={initialTrendingData} />
      </Suspense>
    </MountAnimation>
  );
}
