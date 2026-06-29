import { NextRequest, NextResponse } from 'next/server';

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

  try {
    const data = await fetchWithRetry(url, 2);
    const contentType = detectImageType(data);
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        Vary: 'Accept',
      },
    });
  } catch {
    return new NextResponse('Image fetch failed', { status: 502 });
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
        signal: AbortSignal.timeout(8000),
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
