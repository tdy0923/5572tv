'use client';

export interface BangumiCalendarData {
  weekday: {
    en: string;
    cn?: string;
    ja?: string;
    id?: number;
  };
  items: {
    id: number;
    name: string;
    name_cn?: string;
    rating?: {
      total?: number;
      count?: Record<string, number>;
      score?: number;
    };
    air_date?: string;
    air_weekday?: number;
    rank?: number;
    images?: {
      large?: string;
      common?: string;
      medium?: string;
      small?: string;
      grid?: string;
    };
    collection?: {
      doing?: number;
    };
    url?: string;
    type?: number;
    summary?: string;
  }[];
}

// Client-side cache for bangumi calendar (updates daily, cache for 10 min)
let bangumiCalendarCache: {
  data: BangumiCalendarData[];
  expiresAt: number;
} | null = null;
const BANGUMI_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GetBangumiCalendarData(): Promise<BangumiCalendarData[]> {
  // Check in-memory cache first
  if (bangumiCalendarCache && Date.now() < bangumiCalendarCache.expiresAt) {
    return bangumiCalendarCache.data;
  }

  const response = await fetch('/api/proxy/bangumi?path=calendar');
  const data = await response.json();

  // Cache the result
  bangumiCalendarCache = { data, expiresAt: Date.now() + BANGUMI_CACHE_TTL };

  return data;
}
