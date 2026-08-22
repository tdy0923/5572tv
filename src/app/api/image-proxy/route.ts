import { NextRequest, NextResponse } from 'next/server';

import { isUrlSafeDeep } from '@/lib/ssrf-protection';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

function getRefererForUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    const host = url.hostname;
    if (host.includes('doubanio.com') || host.includes('douban.com')) {
      return 'https://movie.douban.com/';
    }
    if (host.includes('manmankan.com')) {
      return 'https://www.manmankan.com/';
    }
    return `${url.protocol}//${host}/`;
  } catch {
    return 'https://movie.douban.com/';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 },
    );
  }

  const safe = await isUrlSafeDeep(url);
  if (!safe) {
    return NextResponse.json({ error: 'URL rejected' }, { status: 403 });
  }

  const cached = cacheGet(url);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': cached.contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        Vary: 'Accept',
      },
    });
  }

  try {
    // 豆瓣系图片：构建镜像回退链（当前配置源 → 腾讯/阿里 CDN → 官方源），
    // 任一镜像成功即返回，彻底解决单点限流
    const candidates = buildDoubanMirrorCandidates(url);
    let data: ArrayBuffer | null = null;
    let lastErr: unknown = null;
    for (const cand of candidates) {
      try {
        let p = inFlight.get(cand);
        if (!p) {
          p = fetchWithRetry(cand, 1).finally(() => {
            inFlight.delete(cand);
          });
          inFlight.set(cand, p);
        }
        data = await p;
        break;
      } catch (err) {
        lastErr = err;
        continue;
      }
    }
    if (!data) throw lastErr ?? new Error('all mirrors failed');
    const contentType = detectImageType(data);
    cacheSet(url, data, contentType);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        Vary: 'Accept',
      },
    });
  } catch {
    // 回源失败：优先返回过期缓存（陈旧胜于空白），且绝不缓存失败结果
    const stale = cacheGet(url, true);
    if (stale) {
      return new NextResponse(new Uint8Array(stale.buffer), {
        headers: {
          'Content-Type': stale.contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
          'X-Image-Cache': 'stale',
        },
      });
    }
    return new NextResponse(null, {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

function detectImageType(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'image/png';
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  )
    return 'image/webp';
  if (
    bytes[0] === 0x66 &&
    bytes[1] === 0x74 &&
    bytes[2] === 0x79 &&
    bytes[3] === 0x70
  )
    return 'image/avif';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return 'image/gif';
  return 'image/jpeg';
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// --- 进程内图片内存缓存：命中同一张图时直接返回，不重复回源、不重复计入限流 ---
const IMAGE_CACHE_TTL = 30 * 60 * 1000; // 30 分钟
const IMAGE_CACHE_MAX = 500; // 最多缓存 500 张，防止内存无限增长
const imageCache = new Map<
  string,
  { buffer: ArrayBuffer; contentType: string; ts: number }
>();

function cacheGet(
  url: string,
  allowStale = false,
): { buffer: ArrayBuffer; contentType: string; ts: number } | null {
  const entry = imageCache.get(url);
  if (!entry) return null;
  const expired = Date.now() - entry.ts > IMAGE_CACHE_TTL;
  if (expired && !allowStale) {
    imageCache.delete(url);
    return null;
  }
  return entry;
}

// 并发去重：同一海报同时到达时共享一次回源，避免互相挤兑超时
const inFlight = new Map<string, Promise<ArrayBuffer>>();

// 豆瓣镜像池（与前端 DOUBAN_CDN_MIRRORS 保持一致）
const DOUBAN_IMAGE_HOSTS = [
  'img.doubanio.cmliussss.net', // 腾讯 CDN
  'img.doubanio.cmliussss.com', // 阿里 CDN
  'img3.doubanio.com',
];

/** 豆瓣系图片构建镜像回退链：当前配置源优先，其余镜像依次兜底 */
function buildDoubanMirrorCandidates(rawUrl: string): string[] {
  try {
    const u = new URL(rawUrl);
    if (!/doubanio\./i.test(u.hostname)) return [rawUrl]; // 非豆瓣系单候选
    const tail = u.pathname + u.search;
    const ordered = [u.hostname, ...DOUBAN_IMAGE_HOSTS].filter(
      (h, i, arr) => arr.indexOf(h) === i,
    );
    return ordered.map((h) => `https://${h}${tail}`);
  } catch {
    return [rawUrl];
  }
}

function cacheSet(url: string, data: ArrayBuffer, contentType: string) {
  if (imageCache.size >= IMAGE_CACHE_MAX) {
    const oldest = Array.from(imageCache.entries()).sort(
      (a, b) => a[1].ts - b[1].ts,
    )[0];
    if (oldest) imageCache.delete(oldest[0]);
  }
  imageCache.set(url, { buffer: data, contentType, ts: Date.now() });
}

async function fetchWithRetry(
  url: string,
  retries: number,
): Promise<ArrayBuffer> {
  const referer = getRefererForUrl(url);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Referer: referer,
          Accept: 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
        throw new Error('Image too large');
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_IMAGE_SIZE) {
        throw new Error('Image too large');
      }
      return buffer;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}
