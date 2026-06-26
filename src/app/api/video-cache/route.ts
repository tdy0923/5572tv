/**
 * Video Thumbnail Cache API
 * 视频缩略图本地化缓存
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const CACHE_DIR = join(process.cwd(), 'public', 'video-cache');
const MAX_CACHE_SIZE_MB = 200;
const MAX_CACHE_FILES = 5000;

async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

function getCacheFileName(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${Math.abs(hash).toString(36)}.jpg`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    await ensureCacheDir();
    const cacheFile = join(CACHE_DIR, getCacheFileName(url));

    if (existsSync(cacheFile)) {
      const data = await readFile(cacheFile);
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=2592000, s-maxage=2592000',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed' }, { status: 502 });
    }

    const data = await response.arrayBuffer();
    
    if (data.byteLength < 1024 * 1024) {
      await writeFile(cacheFile, Buffer.from(data));
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=2592000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
