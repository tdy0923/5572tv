'use client';

import { useEffect, useRef } from 'react';

import { SearchResult } from '@/lib/types';
import { generateStorageKey, resolveCardPosterUrl } from '@/lib/utils';

import type { WakeLockSentinel } from '../utils';
import { cachedGetAllPlayRecords } from '../utils';

interface UsePlaybackProgressParams {
  artPlayerRef: React.RefObject<any>;
  currentSourceRef: React.RefObject<string>;
  currentIdRef: React.RefObject<string>;
  videoTitleRef: React.RefObject<string>;
  detailRef: React.RefObject<SearchResult | null>;
  currentEpisodeIndexRef: React.RefObject<number>;
  searchTitle: string;
  searchType: string;
  videoDoubanIdRef: React.RefObject<number>;
  savePlayRecordMutation: {
    mutate: (data: any) => void;
  };
  detail: SearchResult | null;
  cleanupPlayer: () => Promise<void>;
  availableSourcesRef: React.RefObject<SearchResult[]>;
}

export function usePlaybackProgress({
  artPlayerRef,
  currentSourceRef,
  currentIdRef,
  videoTitleRef,
  detailRef,
  currentEpisodeIndexRef,
  searchTitle,
  searchType,
  videoDoubanIdRef,
  savePlayRecordMutation,
  detail,
  cleanupPlayer,
  availableSourcesRef,
}: UsePlaybackProgressParams) {
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const resumeTimeRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          'screen',
        );
      }
    } catch (err) {
      console.warn('Wake Lock 请求失败:', err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.warn('Wake Lock 释放失败:', err);
    }
  };

  const saveCurrentPlayProgress = async () => {
    if (
      !artPlayerRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current ||
      !videoTitleRef.current ||
      !detailRef.current?.source_name
    ) {
      return;
    }

    const player = artPlayerRef.current;
    const currentTime = player.currentTime || 0;
    const duration = player.duration || 0;

    if (currentTime < 1 || !duration) {
      return;
    }

    try {
      const existingRecord = await cachedGetAllPlayRecords()
        .then((records) => {
          const key = generateStorageKey(
            currentSourceRef.current,
            currentIdRef.current,
          );
          return records[key];
        })
        .catch(() => null);

      const currentTotalEpisodes = detailRef.current?.episodes.length || 1;

      const sourceFromList = availableSourcesRef.current?.find(
        (s) =>
          s.source === currentSourceRef.current &&
          s.id === currentIdRef.current,
      );
      const remarksToSave =
        sourceFromList?.remarks || detailRef.current?.remarks;

      savePlayRecordMutation.mutate({
        source: currentSourceRef.current,
        id: currentIdRef.current,
        record: {
          title: videoTitleRef.current,
          source_name: detailRef.current?.source_name || '',
          year: detailRef.current?.year,
          cover: resolveCardPosterUrl(detailRef.current?.poster),
          index: currentEpisodeIndexRef.current + 1,
          total_episodes: currentTotalEpisodes,
          original_episodes: existingRecord?.original_episodes,
          play_time: Math.floor(currentTime),
          total_time: Math.floor(duration),
          save_time: Date.now(),
          search_title: searchTitle,
          remarks: remarksToSave,
          douban_id:
            videoDoubanIdRef.current ||
            detailRef.current?.douban_id ||
            undefined,
          type: searchType || undefined,
        },
      });

      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      console.error('保存播放进度失败:', err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentPlayProgress();
      releaseWakeLock();
      cleanupPlayer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentPlayProgress();
        releaseWakeLock();
      } else if (document.visibilityState === 'visible') {
        if (artPlayerRef.current && !artPlayerRef.current.paused) {
          requestWakeLock();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [detail]); // eslint-disable-line react-hooks/exhaustive-deps -- ref.current values intentionally omitted from deps

  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  return {
    saveCurrentPlayProgress,
    resumeTimeRef,
    requestWakeLock,
    releaseWakeLock,
  };
}
