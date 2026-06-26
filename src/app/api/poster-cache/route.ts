/**
 * Poster Cache API
 * 本地化海报，解决防盗链问题
 * 首次请求下载到本地，后续直接返回本地文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const CACHE_DIR = join(process.cwd(), 'public', 'poster-cache');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

// 确保缓存目录存在
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

// 生成缓存文件名（基于URL的hash）
function getCacheFileName(url: string): string {
  // 简单的hash函数
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const ext = url.includes('.webp') ? '.webp' : 
              url.includes('.png') ? '.png' : '.jpg';
  return `${Math.abs(hash).toString(36)}${ext}`;
}

// 获取Referer
function getReferer(url: string): string {
  if (url.includes('doubanio.com') || url.includes('douban.com')) {
    return 'https://movie.douban.com/';
  }
  if (url.includes('manmankan.com')) {
    return 'https://www.manmankan.com/';
  }
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    await ensureCacheDir();
    const cacheFile = join(CACHE_DIR, getCacheFileName(url));

    // 检查缓存是否存在且未过期
    if (existsSync(cacheFile)) {
      const stat = await readFile(cacheFile);
      return new NextResponse(stat, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=604800, s-maxage=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 缓存不存在，下载图片
    const referer = getReferer(url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
    }

    const imageData = await response.arrayBuffer();
    
    // 保存到本地
    await writeFile(cacheFile, Buffer.from(imageData));

    return new NextResponse(imageData, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Poster cache error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
