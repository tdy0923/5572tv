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
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const data = await fetchWithRetry(url, 2);
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        'Vary': '',
      },
    });
  } catch {
    return new NextResponse('Image fetch failed', { status: 502 });
  }
}

async function fetchWithRetry(url: string, retries: number): Promise<ArrayBuffer> {
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
      return response.arrayBuffer();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}
