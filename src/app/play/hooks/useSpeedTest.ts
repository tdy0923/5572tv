'use client';

import { useCallback, useState } from 'react';

import { getCdnDomain, isCdnBlocked } from '@/lib/cdn-blocklist';
import { SearchResult } from '@/lib/types';
import { getVideoResolutionFromM3u8 } from '@/lib/utils';

export type SpeedTestProgress = {
  current: number;
  total: number;
  currentSource: string;
  result?: string;
} | null;

export type VideoInfo = {
  quality: string;
  loadSpeed: string;
  pingTime: number;
};

function calculateSourceScore(
  testResult: VideoInfo,
  maxSpeed: number,
  minPing: number,
  maxPing: number,
): number {
  let score = 0;

  const qualityScore = (() => {
    switch (testResult.quality) {
      case '4K':
        return 100;
      case '2K':
        return 85;
      case '1080p':
        return 75;
      case '720p':
        return 60;
      case '480p':
        return 40;
      case 'SD':
        return 20;
      default:
        return 0;
    }
  })();
  score += qualityScore * 0.4;

  const speedScore = (() => {
    const speedStr = testResult.loadSpeed;
    if (speedStr === '未知' || speedStr === '测量中...') return 30;

    const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
    if (!match) return 30;

    const value = parseFloat(match[1]);
    const unit = match[2];
    const speedKBps = unit === 'MB/s' ? value * 1024 : value;

    const speedRatio = speedKBps / maxSpeed;
    return Math.min(100, Math.max(0, speedRatio * 100));
  })();
  score += speedScore * 0.4;

  const pingScore = (() => {
    const ping = testResult.pingTime;
    if (ping <= 0) return 0;

    if (maxPing === minPing) return 100;

    const pingRatio = (maxPing - ping) / (maxPing - minPing);
    return Math.min(100, Math.max(0, pingRatio * 100));
  })();
  score += pingScore * 0.2;

  return Math.round(score * 100) / 100;
}

export function useSpeedTest() {
  const [speedTestProgress, setSpeedTestProgress] =
    useState<SpeedTestProgress>(null);
  const [precomputedVideoInfo, setPrecomputedVideoInfo] = useState<
    Map<string, VideoInfo>
  >(new Map());

  const fullSpeedTest = useCallback(
    async (
      sources: SearchResult[],
      weights: Record<string, number> = {},
    ): Promise<SearchResult> => {
      let sourcesToTest = sources;

      const testPromises = sourcesToTest.map(async (source, i) => {
        try {
          setSpeedTestProgress({
            current: i + 1,
            total: sourcesToTest.length,
            currentSource: source.source_name,
            result: '测试中...',
          });
          if (!source.episodes || source.episodes.length === 0) return null;
          const episodeUrl =
            source.episodes.length > 1
              ? source.episodes[1]
              : source.episodes[0];
          const cdnDomain = getCdnDomain(episodeUrl);
          if (cdnDomain && isCdnBlocked(cdnDomain)) {
            return null;
          }
          const proxyUrl = `/api/proxy/m3u8?url=${encodeURIComponent(episodeUrl)}&allowCORS=true&_t=${Date.now()}`;
          const result = await getVideoResolutionFromM3u8(proxyUrl);
          return { source, testResult: result };
        } catch {
          return null;
        }
      }) as Promise<{ source: SearchResult; testResult: any } | null>[];

      const timeoutPromise = new Promise<null>((r) =>
        setTimeout(() => r(null), 8000),
      );
      const raceResult = await Promise.race([
        Promise.allSettled(testPromises),
        timeoutPromise,
      ]);

      const successfulResults: Array<{
        source: SearchResult;
        testResult: any;
      }> = [];
      if (raceResult && Array.isArray(raceResult)) {
        for (const r of raceResult) {
          if (r.status === 'fulfilled' && r.value) {
            successfulResults.push(r.value);
          }
        }
      }

      if (successfulResults.length === 0) {
        console.warn('所有播放源测速都失败，使用第一个播放源');
        setPrecomputedVideoInfo(new Map());
        setSpeedTestProgress(null);
        return sources[0];
      }

      const validSpeeds = successfulResults
        .map((result) => {
          const speedStr = result.testResult.loadSpeed;
          if (speedStr === '未知' || speedStr === '测量中...') return 0;

          const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
          if (!match) return 0;

          const value = parseFloat(match[1]);
          const unit = match[2];
          return unit === 'MB/s' ? value * 1024 : value;
        })
        .filter((speed) => speed > 0);

      const maxSpeed = validSpeeds.length > 0 ? Math.max(...validSpeeds) : 1024;

      const validPings = successfulResults
        .map((result) => result.testResult.pingTime)
        .filter((ping) => ping > 0);

      const minPing = validPings.length > 0 ? Math.min(...validPings) : 50;
      const maxPing = validPings.length > 0 ? Math.max(...validPings) : 1000;

      const resultsWithScore = successfulResults.map((result) => {
        const testScore = calculateSourceScore(
          result.testResult,
          maxSpeed,
          minPing,
          maxPing,
        );
        const weight = weights[result.source.source] ?? 50;
        const weightBonus = 1 + (weight - 50) * 0.005;
        const finalScore = testScore * weightBonus;
        return {
          ...result,
          score: finalScore,
          testScore,
          weight,
        };
      });

      resultsWithScore.sort((a, b) => b.score - a.score);

      setSpeedTestProgress(null);

      const infoMap = new Map<string, VideoInfo>();
      successfulResults.forEach((r) => {
        infoMap.set(`${r.source.source}-${r.source.id}`, r.testResult);
      });
      setPrecomputedVideoInfo(infoMap);

      return resultsWithScore[0].source;
    },
    [],
  );

  return { speedTestProgress, precomputedVideoInfo, fullSpeedTest };
}
