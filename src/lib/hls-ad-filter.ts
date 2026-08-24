/**
 * HLS Ad Filter
 * 基于统一广告特征库 (ad-blocker.ts) 的 M3U8 广告过滤。
 *
 * 检测层次（按置信度排序）：
 *  1. URL / 域名特征（最高置信度）
 *  2. #EXT-X-DISCONTINUITY 分块中的短广告块
 *  3. 播放列表边缘的连续广告时长片段（前/后贴片）
 *  4. 时长特征仅作为广告块内部的次要信号，避免误杀正常内容
 */
import { isAdDuration, isAdUrl } from './ad-blocker';

interface ParsedSegment {
  index: number;
  durationLine: string;
  urlLine: string;
  duration: number;
  url: string;
  isAd: boolean;
  reasons: string[];
}

function parseDurationFromExtinf(line: string): number {
  const match = line.match(/#EXTINF:([0-9.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/** 按 DISCONTINUITY 分组 */
function buildGroups(
  lines: string[],
  segments: ParsedSegment[],
): {
  start: number;
  end: number;
  segments: ParsedSegment[];
  totalDuration: number;
}[] {
  const boundaries: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('#EXT-X-DISCONTINUITY')) {
      boundaries.push(i);
    }
  }
  boundaries.push(lines.length);

  const groups: {
    start: number;
    end: number;
    segments: ParsedSegment[];
    totalDuration: number;
  }[] = [];
  for (let b = 0; b < boundaries.length - 1; b++) {
    const groupSegs = segments.filter(
      (s) => s.index >= boundaries[b] && s.index < boundaries[b + 1],
    );
    groups.push({
      start: boundaries[b],
      end: boundaries[b + 1],
      segments: groupSegs,
      totalDuration: groupSegs.reduce((sum, s) => sum + s.duration, 0),
    });
  }
  return groups;
}

function detectAds(
  lines: string[],
  segments: ParsedSegment[],
): { removedIndices: Set<number>; reasons: string[] } {
  const removedIndices = new Set<number>();
  const reasons = new Set<string>();

  // Pass 1: URL / 域名特征（最高置信度）
  for (const seg of segments) {
    if (isAdUrl(seg.url)) {
      seg.isAd = true;
      reasons.add('url-pattern');
    }
  }

  const groups = buildGroups(lines, segments);

  // Pass 2: discontinuity 分块
  if (groups.length > 1) {
    const mainGroup = groups.reduce((a, b) =>
      a.totalDuration > b.totalDuration ? a : b,
    );
    for (const group of groups) {
      if (group === mainGroup) continue;

      // 判断该组是否为"广告组"：
      //   - 组内任一片段 URL 命中广告特征 → 整组移除（含 seg4/seg5 之类正常短组不受影响）
      //   - 或组总时长极短（<30s）且片段数 ≤ 4 且组内含广告时长片段 → 移除
      const hasAdUrlInGroup = group.segments.some((s) => isAdUrl(s.url));
      const hasAdDurationInGroup = group.segments.some(
        (s) => isAdDuration(s.duration).hit,
      );
      const isTinyGroup =
        group.totalDuration < 30 && group.segments.length <= 4;

      if (hasAdUrlInGroup || (isTinyGroup && hasAdDurationInGroup)) {
        for (const s of group.segments) {
          s.isAd = true;
        }
        reasons.add('discontinuity-block');
      }
    }
  } else {
    // Pass 3: 无 discontinuity —— 仅检测开头/结尾连续 ≥2 个"超短"片段（<3.5s，广告贴片）
    const durations = segments.map((s) => s.duration);
    const edgeAds = new Set<number>();

    let i = 0;
    let headCount = 0;
    while (i < segments.length && headCount < 3) {
      const dur = isAdDuration(durations[i]);
      // 只有 <3.5s 的极短片段才算 pre-roll 广告贴片，避免误伤正常分片
      if (dur.hit && durations[i] < 3.5) {
        edgeAds.add(i);
        headCount++;
      } else {
        break;
      }
      i++;
    }

    let j = segments.length - 1;
    let tailCount = 0;
    while (j >= 0 && tailCount < 3) {
      const dur = isAdDuration(durations[j]);
      if (dur.hit && durations[j] < 3.5) {
        edgeAds.add(j);
        tailCount++;
      } else {
        break;
      }
      j--;
    }

    if (edgeAds.size >= 2) {
      for (const idx of edgeAds) {
        segments[idx].isAd = true;
      }
      reasons.add('edge-ad-run');
    }
  }

  // 收集移除索引
  for (const seg of segments) {
    if (seg.isAd) {
      removedIndices.add(seg.index);
      removedIndices.add(seg.index + 1);
    }
  }

  return { removedIndices, reasons: [...reasons] };
}

export function filterAdsFromM3U8(content: string): {
  filtered: string;
  removedCount: number;
  reasons: string[];
} {
  const lines = content.split('\n');
  const segments: ParsedSegment[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const duration = parseDurationFromExtinf(line);
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (nextLine && !nextLine.startsWith('#')) {
        segments.push({
          index: i,
          durationLine: lines[i],
          urlLine: lines[i + 1],
          duration,
          url: nextLine,
          isAd: false,
          reasons: [],
        });
        i += 2;
        continue;
      }
    }
    i++;
  }

  if (segments.length === 0) {
    return { filtered: content, removedCount: 0, reasons: [] };
  }

  const { removedIndices, reasons } = detectAds(lines, segments);

  const filteredLines = lines.filter((_, idx) => !removedIndices.has(idx));

  // 清理连续 DISCONTINUITY
  const cleanedLines: string[] = [];
  let lastWasDiscontinuity = false;
  for (const line of filteredLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXT-X-DISCONTINUITY')) {
      if (lastWasDiscontinuity) continue;
      lastWasDiscontinuity = true;
    } else {
      lastWasDiscontinuity = false;
    }
    cleanedLines.push(line);
  }

  return {
    filtered: cleanedLines.join('\n'),
    removedCount: removedIndices.size / 2,
    reasons,
  };
}
