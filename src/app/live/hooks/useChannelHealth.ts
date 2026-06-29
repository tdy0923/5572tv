'use client';

import { useCallback, useRef, useState } from 'react';

import type { LiveChannel, LiveSource } from '../types';
import type { ChannelHealthInfo } from '../types';
import {
  deriveHealthStatus,
  detectTypeFromUrl,
  normalizeStreamType,
} from '../utils';

const HEALTH_CHECK_CACHE_MS = 3 * 60 * 1000;

interface UseChannelHealthOptions {
  currentSource: LiveSource | null;
  currentSourceRef: React.MutableRefObject<LiveSource | null>;
}

export function useChannelHealth({
  currentSource,
  currentSourceRef,
}: UseChannelHealthOptions) {
  const [channelHealthMap, setChannelHealthMap] = useState<
    Record<string, ChannelHealthInfo>
  >({});
  const channelHealthMapRef = useRef<Record<string, ChannelHealthInfo>>({});
  const healthByUrlCacheRef = useRef<Record<string, ChannelHealthInfo>>({});
  const healthCheckingRef = useRef<Set<string>>(new Set());

  const setChannelHealth = (channelId: string, info: ChannelHealthInfo) => {
    setChannelHealthMap((prevMap) => ({
      ...prevMap,
      [channelId]: info,
    }));
    channelHealthMapRef.current[channelId] = info;
  };

  const checkChannelHealth = useCallback(
    async (
      channel: LiveChannel,
      options?: { force?: boolean },
    ): Promise<ChannelHealthInfo> => {
      const sourceKey = currentSource?.key || currentSourceRef.current?.key;
      const fallbackType = detectTypeFromUrl(channel.url);
      const now = Date.now();

      const fallbackInfo: ChannelHealthInfo = {
        type: fallbackType,
        status: 'unknown',
        checkedAt: now,
      };

      if (!sourceKey) {
        setChannelHealth(channel.id, fallbackInfo);
        return fallbackInfo;
      }

      const cacheKey = `${sourceKey}:${channel.url}`;
      const cachedInfo = healthByUrlCacheRef.current[cacheKey];
      if (
        !options?.force &&
        cachedInfo &&
        now - cachedInfo.checkedAt < HEALTH_CHECK_CACHE_MS
      ) {
        setChannelHealth(channel.id, cachedInfo);
        return cachedInfo;
      }

      if (healthCheckingRef.current.has(cacheKey)) {
        return (
          channelHealthMapRef.current[channel.id] || {
            ...fallbackInfo,
            status: 'checking',
          }
        );
      }

      healthCheckingRef.current.add(cacheKey);
      const checkingInfo: ChannelHealthInfo = {
        type: fallbackType,
        status: 'checking',
        checkedAt: now,
      };
      setChannelHealth(channel.id, checkingInfo);

      try {
        const startedAt =
          typeof performance !== 'undefined' ? performance.now() : 0;
        const precheckUrl = `/api/live/precheck?url=${encodeURIComponent(
          channel.url,
        )}&5572tv-source=${sourceKey}`;
        const response = await fetch(precheckUrl, { cache: 'no-store' });
        const elapsedMs =
          typeof performance !== 'undefined'
            ? Math.round(performance.now() - startedAt)
            : undefined;

        if (!response.ok) {
          const unreachableInfo: ChannelHealthInfo = {
            type: fallbackType,
            status: 'unreachable',
            latencyMs: elapsedMs,
            checkedAt: Date.now(),
            message: `HTTP ${response.status}`,
          };
          healthByUrlCacheRef.current[cacheKey] = unreachableInfo;
          setChannelHealth(channel.id, unreachableInfo);
          return unreachableInfo;
        }

        const result = await response.json();
        const detectedType = normalizeStreamType(result?.type);
        const finalType =
          detectedType === 'unknown' ? fallbackType : detectedType;
        const latencyMs =
          typeof result?.latencyMs === 'number'
            ? result.latencyMs
            : elapsedMs || undefined;
        const healthy = Boolean(result?.success);

        const healthInfo: ChannelHealthInfo = {
          type: finalType,
          status: deriveHealthStatus(healthy, latencyMs),
          latencyMs,
          checkedAt: Date.now(),
          message: healthy ? undefined : result?.error || '预检查失败',
        };
        healthByUrlCacheRef.current[cacheKey] = healthInfo;
        setChannelHealth(channel.id, healthInfo);
        return healthInfo;
      } catch (error) {
        const unreachableInfo: ChannelHealthInfo = {
          type: fallbackType,
          status: 'unreachable',
          checkedAt: Date.now(),
          message: error instanceof Error ? error.message : '网络异常',
        };
        healthByUrlCacheRef.current[cacheKey] = unreachableInfo;
        setChannelHealth(channel.id, unreachableInfo);
        return unreachableInfo;
      } finally {
        healthCheckingRef.current.delete(cacheKey);
      }
    },
    [currentSource],
  );

  return {
    channelHealthMap,
    checkChannelHealth,
  };
}
