'use client';

import { useCallback, useRef, useState } from 'react';

import { deletePlayRecord } from '@/lib/db.client';
import { isHostDead, markHostDead } from '@/lib/dead-cdn-tracker';
import type { SearchResult } from '@/lib/types';
import { resolveCardPosterUrl } from '@/lib/utils';
import { deduplicateDanmaku } from '@/hooks/useDanmu';

import {
  isRetryWindowElapsed,
  isRetryWindowExpired,
  nextFailCount,
  type RetryState,
} from '../source-backoff';
import {
  getSourceIdentityKey,
  isShortDramaSource,
  parseSourceForApi,
} from '../source-identity';

const MAX_SESSION_FAILURES = 50;
const MAX_SOURCE_ERRORS = 2;
const QUICK_PROBE_TIMEOUT_MS = 2000;
const SHORT_DRAMA_PROBE_TIMEOUT_MS = 1200;
const M3U8_PROBE_CONCURRENCY = 3;
let activeM3u8Probes = 0;
const m3u8ProbeQueue: Array<() => void> = [];
async function acquireM3u8ProbeSlot(): Promise<void> {
  if (activeM3u8Probes < M3U8_PROBE_CONCURRENCY) {
    activeM3u8Probes++;
    return;
  }
  await new Promise<void>((r) => m3u8ProbeQueue.push(r));
  activeM3u8Probes++;
}
function releaseM3u8ProbeSlot(): void {
  activeM3u8Probes = Math.max(0, activeM3u8Probes - 1);
  const nxt = m3u8ProbeQueue.shift();
  if (nxt) nxt();
}

export function useSourceSwitching(params: {
  videoTitleRef: React.MutableRefObject<string>;
  videoYearRef: React.MutableRefObject<string>;
  videoDoubanIdRef: React.MutableRefObject<number>;
  setDetail: (d: any) => void;
  setError: (e: string | null) => void;
  artPlayerRef: React.MutableRefObject<any>;
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
  const sourceRetryStateRef = useRef<Map<string, RetryState>>(new Map());
  const totalSessionFailuresRef = useRef(0);
  const fallbackAutoRetriedRef = useRef(false);
  const isSourceChangingRef = useRef(false);
  const sourceErrorCountRef = useRef(0);

  const isSourceAvailable = useCallback((sourceKey: string): boolean => {
    const state = sourceRetryStateRef.current.get(sourceKey);
    const now = Date.now();
    if (isRetryWindowElapsed(state, now)) {
      if (state) sourceRetryStateRef.current.delete(sourceKey);
      return true;
    }
    return false;
  }, []);

  const markSourceFailed = useCallback((sourceKey: string) => {
    const prev = sourceRetryStateRef.current.get(sourceKey);
    sourceRetryStateRef.current.set(sourceKey, {
      failCount: nextFailCount(prev?.failCount),
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
        if (isRetryWindowExpired(state, now)) {
          if (state) sourceRetryStateRef.current.delete(key);
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
      timeout = QUICK_PROBE_TIMEOUT_MS,
      source?: string,
    ): Promise<'ok' | 'slow' | 'fail'> => {
      const effectiveTimeout =
        source && isShortDramaSource(source)
          ? SHORT_DRAMA_PROBE_TIMEOUT_MS
          : timeout;

      if (isHostDead(url)) return 'fail';
      await acquireM3u8ProbeSlot();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), effectiveTimeout);
        const resp = await fetch(
          `/api/proxy/m3u8?url=${encodeURIComponent(url)}`,
          {
            method: 'GET',
            signal: controller.signal,
            headers: { Range: 'bytes=0-0' },
          },
        );
        clearTimeout(timer);
        if (resp.ok && resp.status < 400) return 'ok';
        markHostDead(url);
        return 'fail';
      } catch (err: any) {
        if (err?.name === 'AbortError') return 'slow';
        markHostDead(url);
        return 'fail';
      } finally {
        releaseM3u8ProbeSlot();
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

      // P0-3：用 ref 读取当前集数，避免 handleSourceChange 被播放器创建时的旧闭包捕获
      const liveEpisodeIndex = params.currentEpisodeIndexRef.current;

      if (currentPlayTime > 1) {
        const tempProgressKey = `temp_progress_${newSource}_${newId}_${liveEpisodeIndex}`;
        sessionStorage.setItem(tempProgressKey, currentPlayTime.toString());
      }

      let newDetail = availableSources.find(
        (source) => source.source === newSource && source.id === newId,
      );
      // 兜底：state 可能因渲染时序落后于最新收集结果，ref 始终持有最新数组
      if (!newDetail) {
        newDetail = availableSourcesRef.current.find(
          (source) => source.source === newSource && source.id === newId,
        );
      }
      if (!newDetail) {
        console.warn('[换源] 未在可用源中找到', newSource, newId, {
          stateCount: availableSources.length,
          refCount: availableSourcesRef.current.length,
        });
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

      let targetIndex = liveEpisodeIndex;

      if (detailToUse.episodes && detailToUse.episodes.length > 0) {
        if (targetIndex >= detailToUse.episodes.length) {
          targetIndex = detailToUse.episodes.length - 1;
          const tempProgressKey = `temp_progress_${newSource}_${newId}_${liveEpisodeIndex}`;
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

      if (targetIndex !== liveEpisodeIndex) {
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
                const deduped = deduplicateDanmaku(result.data);
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
    sourceErrorCountRef.current = 0;
    // 切新视频时不清除 deadHosts，跨视频复用以加速跳过已知 525/404 CDN
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
