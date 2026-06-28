import { Suspense } from 'react';

import type { SearchResult, ShortDramaItem } from '@/lib/types';
import type { HomePageData } from '@/hooks/useHomePageQueries';

import { HomeClient } from '@/components/HomeClient';

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
    hotShortDramas = shortData.items || shortData.results || [];
  }

  return { hotMovies, hotTvShows, hotVarietyShows, hotAnime, hotShortDramas };
}

export default async function Page() {
  const initialTrendingData = await getInitialData();
  return (
    <Suspense>
      <HomeClient initialTrendingData={initialTrendingData} />
    </Suspense>
  );
}
