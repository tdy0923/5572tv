/* eslint-disable no-console */

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

/**
 * Get Douban data with caching
 */
async function getCachedDoubanData(url: string): Promise<any> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { data, provider, durationMs } = await fetchDoubanWithProxy<any>(url);

  cache.set(url, { data, timestamp: Date.now() });

  console.log(`Douban fetch: ${provider} (${durationMs}ms)`);

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
