import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { recordRequest } from '@/lib/performance-monitor';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

const TRAILER_SUCCESS_CACHE_TTL = 24 * 60 * 60; // 24小时成功缓存
const TRAILER_RATELIMIT_CACHE_TTL = 60; // 429限流缓存1分钟
const DOUBAN_MIN_INTERVAL_MS = 500; // 内存限流：Douban请求间隔
let lastDoubanRequestTime = 0;

function successCacheKey(id: string) {
  return `trailer:ok:${id}`;
}
function ratelimitCacheKey(id: string) {
  return `trailer:rl:${id}`;
}

async function getCache<T>(key: string): Promise<T | null> {
  try {
    return await db.getCache(key);
  } catch {
    return null;
  }
}

async function setCache(
  key: string,
  value: unknown,
  ttl: number,
): Promise<void> {
  try {
    await db.setCache(key, value, ttl);
  } catch {}
}

async function deleteCache(key: string): Promise<void> {
  try {
    await db.deleteCache(key);
  } catch {}
}

async function fetchTrailerFromDouban(
  type: 'movie' | 'tv',
  id: string,
): Promise<string | null> {
  const now = Date.now();
  const wait = DOUBAN_MIN_INTERVAL_MS - (now - lastDoubanRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastDoubanRequestTime = Date.now();

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(
      `https://m.douban.com/rexxar/api/v2/${type}/${id}`,
      {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Referer: 'https://movie.douban.com/explore',
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    );
    clearTimeout(tid);
    if (resp.status === 429) return null; // 限流直接跳过，不抛错
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.trailers?.[0]?.video_url || null;
  } finally {
    clearTimeout(tid);
  }
}

async function fetchTrailerFromBilibili(
  title: string,
  mediaType: string,
): Promise<{ embedUrl: string; title: string } | null> {
  try {
    const resp = await fetch(
      `/api/bilibili/trailer?q=${encodeURIComponent(title)}&type=${mediaType}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.data?.embedUrl)
      return { embedUrl: data.data.embedUrl, title: data.data.title || title };
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const t0 = Date.now();
  const mem0 = process.memoryUsage().heapUsed;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const title = searchParams.get('title') || '';
  const mediaType = searchParams.get('type') || 'movie';

  if (!id) {
    return NextResponse.json(
      { code: 400, message: '缺少参数: id' },
      { status: 400 },
    );
  }

  // 1. 成功缓存命中（24h）
  const okCache = await getCache<any>(successCacheKey(id));
  if (okCache) {
    return NextResponse.json(okCache, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // 2. 限流缓存命中（1min），直接跳过 Douban
  const rlCache = await getCache<any>(ratelimitCacheKey(id));

  let trailerUrl: string | null = null;
  let source = 'douban';

  // 3. 尝试 Douban（除非刚被限流）
  if (!rlCache) {
    try {
      trailerUrl =
        (await fetchTrailerFromDouban('movie', id)) ||
        (await fetchTrailerFromDouban('tv', id));
    } catch {
      /* ignore */
    }

    if (!trailerUrl) {
      await setCache(
        ratelimitCacheKey(id),
        { rateLimited: true },
        TRAILER_RATELIMIT_CACHE_TTL,
      );
    }
  }

  // 4. Douban 无预告片或限流 → 尝试 Bilibili
  if (!trailerUrl && title) {
    const bili = await fetchTrailerFromBilibili(title, mediaType);
    if (bili) {
      trailerUrl = bili.embedUrl;
      source = 'bilibili';
    }
  }

  // 5. 构造响应
  const ok = {
    code: 200,
    message: '获取成功',
    data: { trailerUrl, type: source, source },
  };
  if (trailerUrl) {
    await setCache(successCacheKey(id), ok, TRAILER_SUCCESS_CACHE_TTL);
  }

  recordRequest({
    timestamp: t0,
    method: 'GET',
    path: '/api/douban/refresh-trailer',
    statusCode: 200,
    duration: Date.now() - t0,
    memoryUsed: (process.memoryUsage().heapUsed - mem0) / 1024 / 1024,
    dbQueries: 0,
    requestSize: 0,
    responseSize: Buffer.byteLength(JSON.stringify(ok), 'utf8'),
  });

  return NextResponse.json(ok, { headers: { 'Cache-Control': 'no-store' } });
}
