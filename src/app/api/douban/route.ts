/**
 * Douban API Endpoint
 * Based on MoonTVPlus/DecoTV implementation
 *
 * Provides Douban movie/TV data with multi-provider proxy
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  fetchDoubanWithProxy,
  getDoubanImageUrl,
  getImageProviderCandidates,
} from '@/lib/douban-proxy';

export const runtime = 'nodejs';

// Cache for Douban data
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_MAX = 300; // 最大缓存条数

// 定期清理过期/超限条目，防止内存无限增长
function pruneDoubanCache() {
  const now = Date.now();
  for (const [url, entry] of cache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) cache.delete(url);
  }
  if (cache.size > CACHE_MAX) {
    const sorted = Array.from(cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );
    const excess = cache.size - CACHE_MAX;
    for (let i = 0; i < excess; i++) {
      cache.delete(sorted[i][0]);
    }
  }
}

/**
 * Get Douban data with caching
 */
async function getCachedDoubanData(url: string): Promise<any> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 缓存未命中时定期清理过期条目
  if (cache.size > CACHE_MAX) {
    pruneDoubanCache();
  }

  const { data, _provider, _durationMs } = await fetchDoubanWithProxy<any>(url);

  cache.set(url, { data, timestamp: Date.now() });
  if (cache.size > CACHE_MAX) {
    pruneDoubanCache();
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'movie';
    const tag = searchParams.get('tag') || '热门';
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '16', 10);
    const id = searchParams.get('id');

    // Get subject detail
    if (id) {
      try {
        const url = `https://m.douban.com/rexxar/api/v2/subject/${id}`;
        const data = await getCachedDoubanData(url);

        // Process image URLs
        if (data?.cover?.img) {
          data.cover.candidates = getImageProviderCandidates(data.cover.img);
        }

        return NextResponse.json({ ok: true, data });
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message || 'Failed to fetch Douban data' },
          { status: 500 },
        );
      }
    }

    // Search by tag
    try {
      const url = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${pageSize}&page_start=${page * pageSize}`;
      const data = await getCachedDoubanData(url);

      // Process image URLs
      if (data?.subjects) {
        for (const subject of data.subjects) {
          if (subject.cover) {
            subject.cover = getDoubanImageUrl(subject.cover);
          }
        }
      }

      return NextResponse.json({ ok: true, data });
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message || 'Failed to search Douban' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Douban API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
