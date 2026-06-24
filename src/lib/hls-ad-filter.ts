/**
 * HLS Ad Filter - Ported from KatelyaTVLocal
 * Detects and removes ad segments from M3U8 playlists
 */

// Known ad segment patterns (±15% tolerance)
const KNOWN_AD_SEGMENT_PATTERNS = [
  { minDuration: 2.3, maxDuration: 3.5, label: '3s ad' },
  { minDuration: 4.5, maxDuration: 6.5, label: '5.6s ad' },
  { minDuration: 12.5, maxDuration: 17.0, label: '15s ad' },
  { minDuration: 18.0, maxDuration: 22.0, label: '20s ad' },
  { minDuration: 25.0, maxDuration: 35.0, label: '30s ad' },
  { minDuration: 40.0, maxDuration: 50.0, label: '45s ad' },
  { minDuration: 55.0, maxDuration: 65.0, label: '60s ad' },
  { minDuration: 85.0, maxDuration: 95.0, label: '90s ad' },
];

// Ad-related URL patterns
const AD_URL_PATTERNS = [
  /ads?\.(?:m3u8|ts|mp4)/i,
  /advert(?:isement)?/i,
  /commercial/i,
  /promo/i,
  /sponsor/i,
  /prebid|vpaid/i,
  /doubleclick|googlesyndication/i,
  /[?&](?:is_?ad|ad[_=]|adid)=/i,
];

// Ad domain patterns
const AD_DOMAIN_PATTERNS = [
  /ffzyad/i,
  /bytegoofy/i,
  /iqiyi\.hbuioo\.com/i,
  /^ad[0-9]*\./i,
  /^ads\./,
  /^adv\./,
];

interface ParsedSegment {
  index: number;
  durationLine: string; // #EXTINF:5.640000,...
  urlLine: string; // segment URL
  duration: number;
  url: string;
  isAd: boolean;
  reasons: string[];
}

function parseDurationFromExtinf(line: string): number {
  const match = line.match(/#EXTINF:([0-9.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

function isAdUrl(url: string): boolean {
  return AD_URL_PATTERNS.some((p) => p.test(url));
}

function isAdDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return AD_DOMAIN_PATTERNS.some((d) =>
      d instanceof RegExp ? d.test(hostname) : hostname.includes(d),
    );
  } catch {
    return false;
  }
}

/**
 * Detect ad segments using duration matching
 */
function detectByDuration(segments: ParsedSegment[]): void {
  for (const seg of segments) {
    for (const pattern of KNOWN_AD_SEGMENT_PATTERNS) {
      if (
        seg.duration >= pattern.minDuration &&
        seg.duration <= pattern.maxDuration
      ) {
        seg.isAd = true;
        seg.reasons.push(`duration:${pattern.label}`);
      }
    }
  }
}

/**
 * Detect ad segments by URL patterns
 */
function detectByUrl(segments: ParsedSegment[]): void {
  for (const seg of segments) {
    if (isAdUrl(seg.url)) {
      seg.isAd = true;
      seg.reasons.push('url-pattern');
    }
    if (isAdDomain(seg.url)) {
      seg.isAd = true;
      seg.reasons.push('ad-domain');
    }
  }
}

/**
 * Detect ad segments by discontinuity grouping
 * Ad segments are often in a separate group with different duration characteristics
 */
function detectByDiscontinuity(
  lines: string[],
  segments: ParsedSegment[],
): void {
  // Find discontinuity boundaries
  const boundaries: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('#EXT-X-DISCONTINUITY')) {
      boundaries.push(i);
    }
  }
  boundaries.push(lines.length);

  // Analyze each block
  const blockStats: Array<{
    start: number;
    end: number;
    segmentCount: number;
    totalDuration: number;
  }> = [];

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

    blockStats.push({
      start: blockStart,
      end: blockEnd,
      segmentCount: segCount,
      totalDuration: totalDur,
    });
  }

  if (blockStats.length <= 1) return;

  // Find the longest block (main content)
  const mainBlock = blockStats.reduce((a, b) =>
    a.totalDuration > b.totalDuration ? a : b,
  );

  // Mark non-main blocks as potential ads if they're short
  for (const block of blockStats) {
    if (block === mainBlock) continue;
    if (block.totalDuration < 180 && block.segmentCount <= 60) {
      for (const seg of segments) {
        if (seg.index >= block.start && seg.index < block.end) {
          seg.isAd = true;
          seg.reasons.push('discontinuity-block');
        }
      }
    }
  }
}

/**
 * Main filter function
 */
export function filterAdsFromM3U8(content: string): {
  filtered: string;
  removedCount: number;
  reasons: string[];
} {
  const lines = content.split('\n');
  const segments: ParsedSegment[] = [];
  const allReasons: string[] = [];

  // Parse segments
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

  // Run detection passes
  detectByDuration(segments);
  detectByUrl(segments);
  detectByDiscontinuity(lines, segments);

  // Collect removed segments
  const removedIndices = new Set<number>();
  for (const seg of segments) {
    if (seg.isAd) {
      removedIndices.add(seg.index);
      removedIndices.add(seg.index + 1); // URL line
      allReasons.push(...seg.reasons);
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

  const uniqueReasons = [...new Set(allReasons)];

  return {
    filtered: cleanedLines.join('\n'),
    removedCount: removedIndices.size / 2, // Each segment = 2 lines
    reasons: uniqueReasons,
  };
}
