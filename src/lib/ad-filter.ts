/**
 * Custom Ad Filter System
 * Based on KatelyaTVLocal implementation
 *
 * Allows users to define custom ad filtering rules for HLS streams
 */

export interface AdFilterRule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'url-pattern' | 'duration' | 'discontinuity' | 'segment-count';
  pattern?: string;
  minDuration?: number;
  maxDuration?: number;
  minSegments?: number;
  maxSegments?: number;
}

// Default ad filter rules
export const DEFAULT_AD_FILTER_RULES: AdFilterRule[] = [
  {
    id: 'default-url-pattern',
    name: '广告URL模式',
    enabled: true,
    type: 'url-pattern',
    pattern: 'ads?\\.(m3u8|ts|mp4)|advertisement|commercial|promo|sponsor',
  },
  {
    id: 'default-duration-short',
    name: '短广告片段 (2-3秒)',
    enabled: true,
    type: 'duration',
    minDuration: 2.8,
    maxDuration: 3.1,
  },
  {
    id: 'default-duration-medium',
    name: '中等广告片段 (14-16秒)',
    enabled: true,
    type: 'duration',
    minDuration: 14.8,
    maxDuration: 15.2,
  },
  {
    id: 'default-duration-long',
    name: '长广告片段 (29-31秒)',
    enabled: true,
    type: 'duration',
    minDuration: 29.5,
    maxDuration: 30.5,
  },
  {
    id: 'default-discontinuity',
    name: '不连续块广告',
    enabled: true,
    type: 'discontinuity',
    maxDuration: 180,
    maxSegments: 60,
  },
];

/**
 * Parse duration from EXTINF line
 */
function parseDuration(line: string): number {
  const match = line.match(/#EXTINF:([0-9.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Check if URL matches pattern
 */
function matchesUrlPattern(url: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(url);
  } catch {
    return false;
  }
}

/**
 * Apply custom ad filter rules to M3U8 content
 */
export function applyCustomAdFilter(
  content: string,
  rules: AdFilterRule[] = DEFAULT_AD_FILTER_RULES,
): { filtered: string; removedCount: number; appliedRules: string[] } {
  const lines = content.split('\n');
  const enabledRules = rules.filter((r) => r.enabled);

  if (enabledRules.length === 0) {
    return { filtered: content, removedCount: 0, appliedRules: [] };
  }

  const removedIndices = new Set<number>();
  const appliedRules: string[] = [];

  // Parse segments
  const segments: Array<{
    index: number;
    duration: number;
    url: string;
    durationLine: string;
    urlLine: string;
  }> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const duration = parseDuration(line);
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (nextLine && !nextLine.startsWith('#')) {
        segments.push({
          index: i,
          duration,
          url: nextLine,
          durationLine: lines[i],
          urlLine: lines[i + 1],
        });
        i += 2;
        continue;
      }
    }
    i++;
  }

  // Apply rules
  for (const rule of enabledRules) {
    switch (rule.type) {
      case 'url-pattern':
        if (rule.pattern) {
          for (const seg of segments) {
            if (matchesUrlPattern(seg.url, rule.pattern)) {
              removedIndices.add(seg.index);
              removedIndices.add(seg.index + 1);
              appliedRules.push(rule.name);
            }
          }
        }
        break;

      case 'duration':
        if (rule.minDuration !== undefined && rule.maxDuration !== undefined) {
          for (const seg of segments) {
            if (
              seg.duration >= rule.minDuration &&
              seg.duration <= rule.maxDuration
            ) {
              removedIndices.add(seg.index);
              removedIndices.add(seg.index + 1);
              appliedRules.push(rule.name);
            }
          }
        }
        break;

      case 'discontinuity':
        // Find discontinuity blocks
        const boundaries: number[] = [0];
        for (let j = 0; j < lines.length; j++) {
          if (lines[j].trim().startsWith('#EXT-X-DISCONTINUITY')) {
            boundaries.push(j);
          }
        }
        boundaries.push(lines.length);

        // Analyze each block
        for (let b = 0; b < boundaries.length - 1; b++) {
          const blockStart = boundaries[b];
          const blockEnd = boundaries[b + 1];
          let segCount = 0;
          let totalDur = 0;

          for (const seg of segments) {
            if (seg.index >= blockStart && seg.index < blockEnd) {
              segCount++;
              totalDur += seg.duration;
            }
          }

          // Check if block matches rule
          if (
            rule.maxDuration !== undefined &&
            rule.maxSegments !== undefined &&
            totalDur <= rule.maxDuration &&
            segCount <= rule.maxSegments &&
            b > 0 // Skip first block (main content)
          ) {
            for (const seg of segments) {
              if (seg.index >= blockStart && seg.index < blockEnd) {
                removedIndices.add(seg.index);
                removedIndices.add(seg.index + 1);
              }
            }
            appliedRules.push(rule.name);
          }
        }
        break;
    }
  }

  // Build filtered output
  const filteredLines = lines.filter((_, idx) => !removedIndices.has(idx));

  // Clean up consecutive DISCONTINUITY tags
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
    appliedRules: [...new Set(appliedRules)],
  };
}

/**
 * Generate ad filter JavaScript code for injection
 */
export function generateAdFilterCode(rules: AdFilterRule[]): string {
  const enabledRules = rules.filter((r) => r.enabled);

  return `
    // Custom Ad Filter
    const adFilterRules = ${JSON.stringify(enabledRules)};
    
    function filterAds(content) {
      // Apply rules here
      return content;
    }
  `;
}
