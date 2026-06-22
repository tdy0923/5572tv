/* eslint-disable no-console */
'use client';

import { useCallback, useRef, useState } from 'react';

import { deletePlayRecord } from '@/lib/db.client';
import type { SearchResult } from '@/lib/types';
import { resolveCardPosterUrl } from '@/lib/utils';

const RETRY_BACKOFFS = [30_000, 120_000, 300_000, 600_000] as const;
const MAX_RETRIES = RETRY_BACKOFFS.length;
const MAX_SESSION_FAILURES = 50;
const MAX_SOURCE_ERRORS = 2;

const parseSourceForApi = (
  source: string,
): { source: string; embyKey?: string } => {
  if (source.startsWith('emby_')) {
    const key = source.substring(5);
    return { source: 'emby', embyKey: key };
  }
  return { source };
};

export function useSourceSwitching(params: {
  videoTitleRef: React.MutableRefObject<string>;
  videoYearRef: React.MutableRefObject<string>;
  videoDoubanIdRef: React.MutableRefObject<number>;
  setDetail: (d: any) => void;
  setError: (e: string | null) => void;
  artPlayerRef: React.MutableRefObject<any>;
  currentEpisodeIndex: number;
  setCurrentEpisodeIndex: (i: number) => void;
  currentSourceRef: React.MutableRefObject<string>;
  currentIdRef: React.MutableRefObject<string>;
  detailRef: React.MutableRefObject<SearchResult | null>;
  currentEpisodeIndexRef: React.MutableRefObject<number>;
  searchTitle: string;
  setVideoTitle: (t: string) => void;
  setVideoYear: (y: string) => void;
  setVideoCover: (c: string) => void;
  setVideoDoubanId: (id: number) => void;
  setCurrentSource: (s: string) => void;
  setCurrentId: (id: string) => void;
  replacePlaybackUrlParams: (params: Record<string, string>) => void;
  setVideoLoadingStage: (stage: 'initing' | 'sourceChanging') => void;
  setIsVideoLoading: (loading: boolean) => void;
  loadExternalDanmu: () => Promise<{ count: number; data: any[] }>;
  externalDanmuEnabledRef: React.MutableRefObject<boolean>;
  episodeSwitchTimeoutRef: React.MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
  lastDanmuLoadKeyRef: React.MutableRefObject<string>;
  danmuLoadingRef: React.MutableRefObject<boolean>;
}) {
  const {
    lastDanmuLoadKeyRef,
    danmuLoadingRef,
    episodeSwitchTimeoutRef,
    setIsVideoLoading,
  } = params;
  const [availableSources, setAvailableSourcesState] = useState<SearchResult[]>(
    [],
  );
  const availableSourcesRef = useRef<SearchResult[]>([]);
  const sourceRetryStateRef = useRef<
    Map<string, { failCount: number; lastFailTime: number }>
  >(new Map());
  const totalSessionFailuresRef = useRef(0);
  const fallbackAutoRetriedRef = useRef(false);
  const isSourceChangingRef = useRef(false);
  const sourceErrorCountRef = useRef(0);

  const getSourceIdentityKey = (source: string, id: string) =>
    `${source}::${id}`;

  const isSourceAvailable = useCallback((sourceKey: string): boolean => {
    const state = sourceRetryStateRef.current.get(sourceKey);
    if (!state) return true;

    const now = Date.now();
    const backoffIndex = Math.min(state.failCount - 1, MAX_RETRIES - 1);
    const nextRetryTime = state.lastFailTime + RETRY_BACKOFFS[backoffIndex];

    if (now >= nextRetryTime) {
      sourceRetryStateRef.current.delete(sourceKey);
      return true;
    }
    return false;
  }, []);

  const markSourceFailed = useCallback((sourceKey: string) => {
    const prev = sourceRetryStateRef.current.get(sourceKey);
    const failCount = Math.min((prev?.failCount || 0) + 1, MAX_RETRIES);
    sourceRetryStateRef.current.set(sourceKey, {
      failCount,
      lastFailTime: Date.now(),
    });
    totalSessionFailuresRef.current++;
  }, []);

  const resetSourceRetries = useCallback(() => {
    sourceRetryStateRef.current.clear();
    totalSessionFailuresRef.current = 0;
  }, []);

  const filterInvalidSources = useCallback(
    (sources: SearchResult[]): SearchResult[] => {
      const now = Date.now();
      return sources.filter((source) => {
        const key = getSourceIdentityKey(source.source, source.id);
        const state = sourceRetryStateRef.current.get(key);
        if (!state) return true;

        const backoffIndex = Math.min(state.failCount - 1, MAX_RETRIES - 1);
        if (now - state.lastFailTime > RETRY_BACKOFFS[backoffIndex]) {
          sourceRetryStateRef.current.delete(key);
          return true;
        }
        return false;
      });
    },
    [],
  );

  const quickProbe = useCallback(
    async (
      url: string,
      timeout = 2000,
      source?: string,
    ): Promise<'ok' | 'slow' | 'fail'> => {
      try {
        const proxyUrl = new URL('/api/proxy/m3u8', window.location.origin);
        proxyUrl.searchParams.set('url', url);
        proxyUrl.searchParams.set('allowCORS', 'true');
        if (source) proxyUrl.searchParams.set('5572tv-source', source);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const resp = await fetch(proxyUrl.toString(), {
          method: 'HEAD',
          mode: 'cors',
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (resp.ok) return 'ok';
        return 'fail';
      } catch (err: any) {
        if (err?.name === 'AbortError') return 'slow';
        return 'fail';
      }
    },
    [],
  );

  const findWorkingSource = async (
    failSource: string,
    failId: string,
    failUrl: string,
  ): Promise<SearchResult | null> => {
    const candidates = filterInvalidSources(availableSourcesRef.current);
    let fallbackSlowSource: SearchResult | null = null;
    for (const candidate of candidates) {
      const cKey = getSourceIdentityKey(candidate.source, candidate.id);
      if (candidate.source === failSource && candidate.id === failId) continue;

      const cUrl =
        candidate.episodes?.[params.currentEpisodeIndexRef.current] ||
        candidate.episodes?.[0];
      if (failUrl && cUrl === failUrl) {
        markSourceFailed(cKey);
        continue;
      }

      if (cUrl) {
        const probe = await quickProbe(cUrl, 2000, candidate.source);
        if (probe === 'fail') {
          markSourceFailed(cKey);
          continue;
        }
        if (probe === 'ok') return candidate;
        fallbackSlowSource = fallbackSlowSource || candidate;
        continue;
      }
      return candidate;
    }
    return fallbackSlowSource;
  };

  const handleSourceChange = async (
    newSource: string,
    newId: string,
    newTitle: string,
  ) => {
    try {
      if (isSourceChangingRef.current) return;

      isSourceChangingRef.current = true;

      params.setVideoLoadingStage('sourceChanging');
      setIsVideoLoading(true);

      lastDanmuLoadKeyRef.current = '';
      danmuLoadingRef.current = false;

      if (episodeSwitchTimeoutRef.current) {
        clearTimeout(episodeSwitchTimeoutRef.current);
        episodeSwitchTimeoutRef.current = null;
      }

      if (params.artPlayerRef.current?.plugins?.artplayerPluginDanmuku) {
        const plugin =
          params.artPlayerRef.current.plugins.artplayerPluginDanmuku;
        try {
          if (typeof plugin.reset === 'function') {
            plugin.reset();
          }
          if (typeof plugin.load === 'function') {
            plugin.load();
          }
          if (typeof plugin.hide === 'function') {
            plugin.hide();
          }
        } catch (error) {
          console.warn('清空弹幕时出错，但继续换源:', error);
        }
      }

      const currentPlayTime = params.artPlayerRef.current?.currentTime || 0;

      if (currentPlayTime > 1) {
        const tempProgressKey = `temp_progress_${newSource}_${newId}_${params.currentEpisodeIndex}`;
        sessionStorage.setItem(tempProgressKey, currentPlayTime.toString());
      }

      const newDetail = availableSources.find(
        (source) => source.source === newSource && source.id === newId,
      );
      if (!newDetail) {
        isSourceChangingRef.current = false;
        setIsVideoLoading(false);
        params.setError('未找到匹配结果');
        return;
      }

      let detailToUse = newDetail;
      if (
        (newDetail.source === 'emby' || newDetail.source.startsWith('emby_')) &&
        (!newDetail.episodes || newDetail.episodes.length === 0)
      ) {
        try {
          const { embyKey } = parseSourceForApi(newSource);
          const embyKeyParam = embyKey ? `&embyKey=${embyKey}` : '';
          const detailResponse = await fetch(
            `/api/emby/detail?id=${newId}${embyKeyParam}`,
          );
          if (detailResponse.ok) {
            const detailSources =
              (await detailResponse.json()) as SearchResult[];
            if (detailSources.length > 0) {
              detailToUse = detailSources[0];
            }
          }
        } catch (err) {
          console.error('[Play] Failed to fetch Emby detail:', err);
        }
      }

      let targetIndex = params.currentEpisodeIndex;

      if (detailToUse.episodes && detailToUse.episodes.length > 0) {
        if (targetIndex >= detailToUse.episodes.length) {
          targetIndex = detailToUse.episodes.length - 1;
          const tempProgressKey = `temp_progress_${newSource}_${newId}_${params.currentEpisodeIndex}`;
          sessionStorage.removeItem(tempProgressKey);
        }
      }

      params.setVideoTitle(detailToUse.title || newTitle);
      params.setVideoYear(detailToUse.year);
      params.setVideoCover(resolveCardPosterUrl(detailToUse.poster));
      params.setVideoDoubanId(
        params.videoDoubanIdRef.current || detailToUse.douban_id || 0,
      );
      params.setCurrentSource(newSource);
      params.setCurrentId(newId);
      params.setDetail(detailToUse);

      if (targetIndex !== params.currentEpisodeIndex) {
        params.setCurrentEpisodeIndex(targetIndex);
      }

      params.replacePlaybackUrlParams({
        source: newSource,
        id: newId,
        year: detailToUse.year,
        index: targetIndex.toString(),
        title: detailToUse.title || newTitle,
        stitle:
          params.searchTitle ||
          params.videoTitleRef.current ||
          detailToUse.title ||
          newTitle,
      });

      setTimeout(async () => {
        // Guard against unmount during timeout
        if (!isSourceChangingRef.current && !params.artPlayerRef.current)
          return;
        isSourceChangingRef.current = false;
        setIsVideoLoading(false);

        if (params.currentSourceRef.current && params.currentIdRef.current) {
          try {
            await deletePlayRecord(
              params.currentSourceRef.current,
              params.currentIdRef.current,
            );
          } catch (err) {
            console.error('清除播放记录失败:', err);
          }
        }

        if (
          params.artPlayerRef.current?.plugins?.artplayerPluginDanmuku &&
          params.externalDanmuEnabledRef.current
        ) {
          lastDanmuLoadKeyRef.current = '';
          danmuLoadingRef.current = false;

          try {
            const result = await params.loadExternalDanmu();

            if (
              result.count > 0 &&
              params.artPlayerRef.current?.plugins?.artplayerPluginDanmuku
            ) {
              const plugin =
                params.artPlayerRef.current.plugins.artplayerPluginDanmuku;

              plugin.reset();
              plugin.load();

              if (result.count > 1000) {
                const firstBatch = result.data.slice(0, 500);
                plugin.load(firstBatch);

                const remainingBatches = [];
                for (let i = 500; i < result.data.length; i += 300) {
                  remainingBatches.push(result.data.slice(i, i + 300));
                }

                remainingBatches.forEach((batch, index) => {
                  setTimeout(
                    () => {
                      if (
                        params.artPlayerRef.current?.plugins
                          ?.artplayerPluginDanmuku
                      ) {
                        batch.forEach((danmu) => {
                          plugin.emit(danmu).catch(console.warn);
                        });
                      }
                    },
                    (index + 1) * 100,
                  );
                });
              } else {
                // Client-side dedup before loading into plugin
                const seen = new Set<string>();
                const deduped = result.data.filter((d: any) => {
                  const key = `${Math.round(d.time * 100) / 100}_${(d.text || '').trim().toLowerCase()}_${d.color || 'default'}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                plugin.load(deduped);
              }
            }
          } catch (error) {
            console.error('换源后弹幕加载失败:', error);
          }
        }
      }, 1000);
    } catch (err) {
      isSourceChangingRef.current = false;
      setIsVideoLoading(false);
      params.setError(err instanceof Error ? err.message : '换源失败');
    }
  };

  const resetSourceState = useCallback(() => {
    sourceRetryStateRef.current.clear();
    totalSessionFailuresRef.current = 0;
    fallbackAutoRetriedRef.current = false;
  }, []);

  const setAvailableSources = useCallback((sources: SearchResult[]) => {
    setAvailableSourcesState(sources);
    availableSourcesRef.current = sources;
  }, []);

  return {
    handleSourceChange,
    findWorkingSource,
    availableSources,
    setAvailableSources,
    availableSourcesRef,
    sourceRetryStateRef,
    totalSessionFailuresRef,
    fallbackAutoRetriedRef,
    isSourceChangingRef,
    sourceErrorCountRef,
    currentSourceRef: params.currentSourceRef,
    currentIdRef: params.currentIdRef,
    getSourceIdentityKey,
    markSourceFailed,
    filterInvalidSources,
    isSourceAvailable,
    resetSourceRetries,
    resetSourceState,
    MAX_SOURCE_ERRORS,
    MAX_SESSION_FAILURES,
  };
}
