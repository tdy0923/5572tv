/**
 * Image Proxy Endpoint
 * Optimized for fast poster loading with request deduplication
 */

import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

// Request deduplication - prevent multiple concurrent requests for same image
const pendingRequests = new Map<string, Promise<ArrayBuffer>>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// 根据图片URL域名动态设置Referer
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
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 },
      );
    }

    const decodedUrl = url;

    // Check if there's already a pending request for this URL (deduplication)
    if (pendingRequests.has(decodedUrl)) {
      const cachedData = await pendingRequests.get(decodedUrl)!;
      return new NextResponse(cachedData, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
    }

    // Create and cache the fetch promise
    const fetchPromise = fetchImage(decodedUrl);
    pendingRequests.set(decodedUrl, fetchPromise);

    try {
      const data = await fetchPromise;
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
    } finally {
      // Clean up pending request after delay (for concurrent browser requests)
      setTimeout(() => pendingRequests.delete(decodedUrl), 3000);
    }
  } catch (error) {
    // Return 1x1 transparent pixel on error
    const pixel = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x01, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);
    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}

async function fetchImage(decodedUrl: string): Promise<ArrayBuffer> {
  const referer = getRefererForUrl(decodedUrl);

  const response = await fetch(decodedUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Referer: referer,
      Accept: 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(5000), // Reduced from 10s to 5s
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.arrayBuffer();
}
