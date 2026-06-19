/* eslint-disable no-console */

/**
 * Image Proxy Endpoint
 * Based on MoonTVPlus/DecoTV implementation
 *
 * Proxies images from Douban, MangaBZ, Manmankan and other sources to bypass CORS
 */

import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

// Cache for images
const imageCache = new Map<
  string,
  { data: ArrayBuffer; contentType: string; timestamp: number }
>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000;

// 根据图片URL域名动态设置Referer
function getRefererForUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    const host = url.hostname;

    // 豆瓣图片
    if (host.includes('doubanio.com') || host.includes('douban.com')) {
      return 'https://movie.douban.com/';
    }
    // MangaBZ图片
    if (host.includes('mangabz.com')) {
      return 'https://www.mangabz.com/';
    }
    // Manmankan图片（发布日历）
    if (host.includes('manmankan.com')) {
      return 'https://www.manmankan.com/';
    }
    // 通用：使用图片所在域名
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

    // Decode URL
    const decodedUrl = decodeURIComponent(url);

    // Check cache
    const cached = imageCache.get(decodedUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(cached.data, {
        headers: {
          'Content-Type': cached.contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
    }

    // 动态设置Referer
    const referer = getRefererForUrl(decodedUrl);

    // Fetch image
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Referer: referer,
        Accept: 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Return a 1x1 transparent pixel for failed images instead of error
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
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const data = await response.arrayBuffer();

    // Cache the image
    if (imageCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = imageCache.keys().next().value;
      if (firstKey) imageCache.delete(firstKey);
    }
    imageCache.set(decodedUrl, {
      data,
      contentType,
      timestamp: Date.now(),
    });

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    // Return a 1x1 transparent pixel instead of 500
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
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  }
}
