import { timeToSeconds } from '@/lib/time-utils';
import type { SkipSegment } from '@/lib/types';

export interface SkipDefaultsSettings {
  openingStart: string;
  openingEnd: string;
  endingStart: string;
  endingMode: string; // 'remaining' | 'absolute'
  autoSkip: boolean;
  autoNextEpisode: boolean;
}

/**
 * 纯函数：在没有已保存跳过配置时，根据用户默认设置 + 视频时长生成临时跳过区间。
 * 规则（历史上易错，锁定于此）：
 * - 短视频(<300s)不启用默认片头检测（除非片头 < 30% 时长）。
 * - 片头结束最多占视频 40%。
 * - 片尾仅当开始点落在后 40%（ratio > 0.6）才启用，避免误判。
 */
export function buildDefaultSkipSegments(params: {
  duration: number;
  settings: SkipDefaultsSettings;
}): SkipSegment[] {
  const { duration, settings } = params;
  const segments: SkipSegment[] = [];

  const openingStart = timeToSeconds(settings.openingStart);
  const openingEnd = timeToSeconds(settings.openingEnd);
  const isShortVideo = duration > 0 && duration < 300;
  const shouldEnableOpening =
    openingStart < openingEnd && (!isShortVideo || openingEnd < duration * 0.3);

  if (shouldEnableOpening) {
    segments.push({
      type: 'opening',
      start: openingStart,
      end: Math.min(openingEnd, duration * 0.4),
      autoSkip: settings.autoSkip,
    });
  }

  if (duration > 0 && settings.endingStart) {
    const endingStartSeconds = timeToSeconds(settings.endingStart);
    const endingStart =
      settings.endingMode === 'remaining'
        ? duration - endingStartSeconds
        : endingStartSeconds;
    const endingStartRatio = endingStart / duration;
    const shouldEnableEnding = endingStart < duration && endingStartRatio > 0.6;

    if (shouldEnableEnding) {
      segments.push({
        type: 'ending',
        start: endingStart,
        end: duration,
        autoSkip: settings.autoSkip,
        autoNextEpisode: settings.autoNextEpisode,
        mode: settings.endingMode as 'absolute' | 'remaining',
        remainingTime:
          settings.endingMode === 'remaining' ? endingStartSeconds : undefined,
      });
    }
  }

  return segments;
}

/**
 * 纯函数：把已保存的跳过区间按当前视频时长重新解析。
 * remaining 模式的片尾区间需按实际 duration 重算 start/end。
 */
export function resolveSegmentsForDuration(
  segments: SkipSegment[],
  duration: number,
): SkipSegment[] {
  return segments.map((seg) => {
    if (
      seg.type === 'ending' &&
      seg.mode === 'remaining' &&
      seg.remainingTime
    ) {
      return {
        ...seg,
        start: duration - seg.remainingTime,
        end: duration,
      };
    }
    return seg;
  });
}

/** 纯函数：返回给定播放时刻命中的跳过区间（含边界）。 */
export function findActiveSegment(
  time: number,
  segments: SkipSegment[],
): SkipSegment | undefined {
  return segments.find((s) => time >= s.start && time <= s.end);
}
