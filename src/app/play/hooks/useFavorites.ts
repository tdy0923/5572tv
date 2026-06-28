/* eslint-disable no-console */
'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeToDataUpdates } from '@/lib/db.client';
import type { SearchResult } from '@/lib/types';
import { resolveCardPosterUrl } from '@/lib/utils';

import { cachedGetAllFavorites, parseStorageKey } from '../utils';

interface UseFavoritesParams {
  currentSource: string;
  currentId: string;
  videoDoubanId: number;
  shortdramaId: string;
  videoTitleRef: React.RefObject<string>;
  videoYearRef: React.RefObject<string>;
  videoCover: string;
  detail: SearchResult | null;
  searchTitle: string;
  saveFavoriteMutation: UseMutationResult<any, Error, any>;
  deleteFavoriteMutation: UseMutationResult<any, Error, any>;
}

const inferType = (typeName?: string): string | undefined => {
  if (!typeName) return undefined;
  const lowerType = typeName.toLowerCase();
  if (
    lowerType.includes('短剧') ||
    lowerType.includes('shortdrama') ||
    lowerType.includes('short-drama') ||
    lowerType.includes('short drama')
  )
    return 'shortdrama';
  if (lowerType.includes('综艺') || lowerType.includes('variety'))
    return 'variety';
  if (lowerType.includes('电影') || lowerType.includes('movie')) return 'movie';
  if (
    lowerType.includes('电视剧') ||
    lowerType.includes('剧集') ||
    lowerType.includes('tv') ||
    lowerType.includes('series')
  )
    return 'tv';
  if (
    lowerType.includes('动漫') ||
    lowerType.includes('动画') ||
    lowerType.includes('anime')
  )
    return 'anime';
  if (lowerType.includes('纪录片') || lowerType.includes('documentary'))
    return 'documentary';
  return undefined;
};

export function useFavorites({
  currentSource,
  currentId,
  videoDoubanId,
  shortdramaId,
  videoTitleRef,
  videoYearRef,
  videoCover,
  detail,
  searchTitle,
  saveFavoriteMutation,
  deleteFavoriteMutation,
}: UseFavoritesParams) {
  const [favorited, setFavorited] = useState(false);
  const favoritedKeyRef = useRef<string | null>(null);

  const detailRef = useRef<SearchResult | null>(detail);
  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoDoubanIdRef = useRef(videoDoubanId);

  useEffect(() => {
    detailRef.current = detail;
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    videoDoubanIdRef.current = videoDoubanId;
  });

  const findMatchedFavoriteKey = useCallback(
    (favorites: Record<string, any>): string | null => {
      const currentKey =
        currentSource && currentId ? `${currentSource}+${currentId}` : null;
      if (currentKey && favorites[currentKey]) return currentKey;

      if (videoDoubanId) {
        const doubanKey = `douban+${videoDoubanId}`;
        if (favorites[doubanKey]) return doubanKey;
        const bangumiKey = `bangumi+${videoDoubanId}`;
        if (favorites[bangumiKey]) return bangumiKey;
      }
      if (shortdramaId) {
        const sdKey = `shortdrama+${shortdramaId}`;
        if (favorites[sdKey]) return sdKey;
      }

      const title = videoTitleRef.current;
      if (title) {
        for (const [key, fav] of Object.entries(favorites)) {
          if ((fav as any)?.title === title) return key;
        }
      }

      return null;
    },
    [currentSource, currentId, videoDoubanId, shortdramaId, videoTitleRef],
  );

  useEffect(() => {
    if (!currentSource || !currentId) return;
    (async () => {
      try {
        const favorites = await cachedGetAllFavorites();

        const matchedKey = findMatchedFavoriteKey(favorites);
        favoritedKeyRef.current = matchedKey;
        setFavorited(!!matchedKey);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    })();
  }, [
    currentSource,
    currentId,
    videoDoubanId,
    shortdramaId,
    findMatchedFavoriteKey,
  ]);

  useEffect(() => {
    if (!currentSource || !currentId) return;

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (favorites: Record<string, any>) => {
        const matchedKey = findMatchedFavoriteKey(favorites);
        favoritedKeyRef.current = matchedKey;
        setFavorited(!!matchedKey);
      },
    );

    return unsubscribe;
  }, [
    currentSource,
    currentId,
    videoDoubanId,
    shortdramaId,
    findMatchedFavoriteKey,
  ]);

  useEffect(() => {
    if (!detail || !currentSource || !currentId) return;

    const updateFavoriteData = async () => {
      try {
        const realEpisodes = detail.episodes.length || 1;
        const favorites = await cachedGetAllFavorites();

        const favoriteKey = findMatchedFavoriteKey(favorites);
        if (!favoriteKey) return;
        const favoriteToUpdate = favorites[favoriteKey];

        const needsUpdate =
          favoriteToUpdate.total_episodes === 99 ||
          favoriteToUpdate.total_episodes !== realEpisodes ||
          !favoriteToUpdate.source_name ||
          favoriteToUpdate.source_name === '即将上映' ||
          favoriteToUpdate.source_name === '豆瓣' ||
          favoriteToUpdate.source_name === 'Bangumi';

        if (needsUpdate) {
          const { source: favSource, id: favId } = parseStorageKey(favoriteKey);

          let contentType =
            favoriteToUpdate.type || inferType(detail.type_name);
          if (!contentType && favSource === 'shortdrama') {
            contentType = 'shortdrama';
          }

          saveFavoriteMutation.mutate({
            source: favSource,
            id: favId,
            favorite: {
              title:
                videoTitleRef.current || detail.title || favoriteToUpdate.title,
              source_name:
                detail.source_name || favoriteToUpdate.source_name || '',
              year: detail.year || favoriteToUpdate.year || '',
              cover: resolveCardPosterUrl(
                detail.poster,
                favoriteToUpdate.cover,
              ),
              total_episodes: realEpisodes,
              save_time: favoriteToUpdate.save_time || Date.now(),
              search_title: favoriteToUpdate.search_title || searchTitle,
              releaseDate: favoriteToUpdate.releaseDate,
              remarks: favoriteToUpdate.remarks,
              type: contentType,
            },
          });
        }
      } catch (err) {
        console.error('自动更新收藏数据失败:', err);
      }
    };

    updateFavoriteData();
  }, [detail, currentSource, currentId, videoDoubanId, searchTitle]);

  const handleToggleFavorite = async () => {
    if (
      !videoTitleRef.current ||
      !detailRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current
    )
      return;

    if (favorited) {
      const keyToDelete =
        favoritedKeyRef.current ||
        `${currentSourceRef.current}+${currentIdRef.current}`;
      const { source: delSource, id: delId } = parseStorageKey(keyToDelete);

      deleteFavoriteMutation.mutate(
        {
          source: delSource,
          id: delId,
        },
        {
          onSuccess: () => {
            favoritedKeyRef.current = null;
            setFavorited(false);
          },
          onError: (err) => {
            console.error('删除收藏失败:', err);
          },
        },
      );
    } else {
      let contentType = inferType(detailRef.current?.type_name);
      if (!contentType && currentSourceRef.current === 'shortdrama') {
        contentType = 'shortdrama';
      }

      const newKey = `${currentSourceRef.current}+${currentIdRef.current}`;

      saveFavoriteMutation.mutate(
        {
          source: currentSourceRef.current,
          id: currentIdRef.current,
          favorite: {
            title: videoTitleRef.current,
            source_name: detailRef.current?.source_name || '',
            year: videoYearRef.current || detailRef.current?.year,
            cover: resolveCardPosterUrl(detailRef.current?.poster, videoCover),
            total_episodes: detailRef.current?.episodes.length || 1,
            save_time: Date.now(),
            search_title: searchTitle,
            type: contentType,
            douban_id: videoDoubanIdRef.current || undefined,
          },
        },
        {
          onSuccess: () => {
            favoritedKeyRef.current = newKey;
            setFavorited(true);
          },
          onError: (err) => {
            console.error('添加收藏失败:', err);
          },
        },
      );
    }
  };

  return {
    favorited,
    favoritedKeyRef,
    handleToggleFavorite,
  };
}
