'use client';
import { useCallback } from 'react';

import { generateStorageKey } from '@/lib/db.client';

import { cachedGetAllPlayRecords, replacePlaybackUrlParams } from '../utils';

export function useEpisodeHandlers(params: {
  artPlayerRef: React.RefObject<any>;
  detailRef: React.RefObject<any>;
  currentEpisodeIndexRef: React.RefObject<number>;
  currentSourceRef: React.RefObject<string>;
  currentIdRef: React.RefObject<string>;
  saveCurrentPlayProgress: () => Promise<void>;
  setCurrentEpisodeIndex: (idx: number) => void;
  totalEpisodes: number;
  isSkipControllerTriggeredRef: React.RefObject<boolean>;
  resumeTimeRef: React.RefObject<number | null>;
}) {
  const {
    artPlayerRef,
    detailRef,
    currentEpisodeIndexRef,
    currentSourceRef,
    currentIdRef,
    saveCurrentPlayProgress,
    setCurrentEpisodeIndex,
    totalEpisodes,
    isSkipControllerTriggeredRef,
    resumeTimeRef,
  } = params;

  const handleEpisodeChange = useCallback(
    async (episodeNumber: number) => {
      if (episodeNumber >= 0 && episodeNumber < totalEpisodes) {
        if (artPlayerRef.current) {
          saveCurrentPlayProgress();
        }

        try {
          const allRecords = await cachedGetAllPlayRecords();
          const key = generateStorageKey(
            currentSourceRef.current,
            currentIdRef.current,
          );
          const record = allRecords[key];

          if (
            record &&
            record.index - 1 === episodeNumber &&
            record.play_time > 0
          ) {
            resumeTimeRef.current = record.play_time;
          } else {
            resumeTimeRef.current = 0;
          }
        } catch (err) {
          console.warn('读取历史记录失败:', err);
          resumeTimeRef.current = 0;
        }

        try {
          replacePlaybackUrlParams({ index: episodeNumber.toString() });
        } catch (err) {
          console.warn('更新URL参数失败:', err);
        }

        setCurrentEpisodeIndex(episodeNumber);
      }
    },
    [
      artPlayerRef,
      currentIdRef,
      currentSourceRef,
      saveCurrentPlayProgress,
      setCurrentEpisodeIndex,
      totalEpisodes,
      resumeTimeRef,
    ],
  );

  const handlePreviousEpisode = useCallback(() => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx > 0) {
      if (artPlayerRef.current && !artPlayerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      replacePlaybackUrlParams({ index: String(idx - 1) });
      setCurrentEpisodeIndex(idx - 1);
    }
  }, [
    artPlayerRef,
    currentEpisodeIndexRef,
    detailRef,
    saveCurrentPlayProgress,
    setCurrentEpisodeIndex,
  ]);

  const handleNextEpisode = useCallback(() => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx < d.episodes.length - 1) {
      isSkipControllerTriggeredRef.current = true;
      replacePlaybackUrlParams({ index: String(idx + 1) });
      setCurrentEpisodeIndex(idx + 1);
    }
  }, [
    currentEpisodeIndexRef,
    detailRef,
    isSkipControllerTriggeredRef,
    setCurrentEpisodeIndex,
  ]);

  return { handleEpisodeChange, handlePreviousEpisode, handleNextEpisode };
}
