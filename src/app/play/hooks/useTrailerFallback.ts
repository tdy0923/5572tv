/* eslint-disable no-console */
'use client';

import type { MutableRefObject, RefObject } from 'react';

import type { SearchResult } from '@/lib/types';

export function useTrailerFallback(
  videoDoubanIdRef: MutableRefObject<number>,
  videoTitleRef: RefObject<string>,
  videoYearRef: RefObject<string>,
  searchType: string,
) {
  return async function tryTrailerFallback(
    effectiveQuery: string,
    finalResults: SearchResult[],
  ): Promise<void> {
    if (finalResults.length === 0) {
      if (videoDoubanIdRef.current === 0) {
        try {
          const searchResp = await fetch(
            `/api/douban/search?q=${encodeURIComponent(effectiveQuery)}`,
            { signal: AbortSignal.timeout(8000) },
          );
          if (searchResp.ok) {
            const searchData = await searchResp.json();
            const match = searchData?.results?.[0];
            if (match?.id > 0) {
              videoDoubanIdRef.current = match.id;
            }
          }
        } catch (doubanErr) {
          console.warn('豆瓣搜索失败:', doubanErr);
        }
      }

      if (videoDoubanIdRef.current > 0) {
        try {
          const trailerResp = await fetch(
            `/api/douban/refresh-trailer?id=${videoDoubanIdRef.current}&title=${encodeURIComponent(videoTitleRef.current || effectiveQuery)}&type=${searchType || 'movie'}`,
            { signal: AbortSignal.timeout(15000) },
          );
          if (trailerResp.ok) {
            const trailerData = await trailerResp.json();
            const trailerUrl =
              trailerData?.data?.trailerUrl ||
              trailerData?.data?.url ||
              trailerData?.url ||
              trailerData?.trailerUrl ||
              '';
            const trailerType = trailerData?.data?.type || 'douban';
            if (trailerUrl) {
              const isEmbed =
                trailerUrl.includes('bilibili.com/player') ||
                trailerUrl.includes('youtube.com/embed');
              const proxiedTrailer = isEmbed
                ? trailerUrl
                : `/api/video-proxy?url=${encodeURIComponent(trailerUrl)}`;
              const trailerLabel =
                trailerType === 'bilibili' ? 'B站预告片' : '豆瓣预告片';
              finalResults.push({
                source: 'douban_trailer' as any,
                id: String(videoDoubanIdRef.current),
                source_name: trailerLabel,
                title: effectiveQuery,
                year: videoYearRef.current || '',
                episodes: [proxiedTrailer],
                type_name: searchType || 'movie',
                douban_id: videoDoubanIdRef.current,
                class: '',
                poster: '',
                episodes_titles: [trailerLabel],
              } as SearchResult);
            }
          }
        } catch (trailerErr) {
          console.warn('获取豆瓣预告片失败:', trailerErr);
        }
      }
    }
  };
}
