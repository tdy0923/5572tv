/* eslint-disable no-console */

/**
 * Image Proxy Endpoint
 * Based on MoonTVPlus/DecoTV implementation
 *
 * Proxies images from Douban and other sources to bypass CORS
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

    // Fetch image
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Referer: 'https://movie.douban.com/',
        Accept: 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status },
      );
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
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
