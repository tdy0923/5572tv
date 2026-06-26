/**
 * Poster Cache API - 智能缓存策略
 * 严格控制存储空间，按需缓存，自动清理
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const CACHE_DIR = join(process.cwd(), 'public', 'poster-cache');
const MAX_CACHE_SIZE_MB = 1500; // 海报缓存 1.5GB
const MAX_CACHE_FILES = 30000; // 最大文件数
const MAX_AGE_DAYS = 30; // 30天未访问自动清理
const CLEANUP_INTERVAL = 1000; // 每1000次请求清理一次

let requestCount = 0;

// 确保缓存目录存在
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

// 生成缓存文件名
function getCacheFileName(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
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

// 获取缓存统计
async function getCacheStats() {
  try {
    const files = await readdir(CACHE_DIR);
    let totalSize = 0;
    for (const file of files) {
      const filePath = join(CACHE_DIR, file);
      const fileStat = await stat(filePath);
      totalSize += fileStat.size;
    }
    return {
      count: files.length,
      sizeMB: Math.round(totalSize / 1024 / 1024),
    };
  } catch {
    return { count: 0, sizeMB: 0 };
  }
}

// 清理过期缓存
async function cleanupExpiredCache() {
  try {
    const files = await readdir(CACHE_DIR);
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      const filePath = join(CACHE_DIR, file);
      try {
        const fileStat = await stat(filePath);
        const age = now - fileStat.mtimeMs;
        
        // 删除超过30天未访问的文件
        if (age > maxAge) {
          await unlink(filePath);
          deletedCount++;
        }
      } catch {
        // 忽略单个文件错误
      }
    }
    
    return deletedCount;
  } catch {
    return 0;
  }
}

// 智能清理：超过限制时删除最旧的文件
async function smartCleanup() {
  const stats = await getCacheStats();
  
  // 如果文件数超过限制，删除最旧的20%
  if (stats.count > MAX_CACHE_FILES) {
    const files = await readdir(CACHE_DIR);
    const fileStats = await Promise.all(
      files.map(async (file) => ({
        name: file,
        mtime: (await stat(join(CACHE_DIR, file))).mtimeMs,
      }))
    );
    
    // 按修改时间排序，删除最旧的20%
    fileStats.sort((a, b) => a.mtime - b.mtime);
    const toDelete = fileStats.slice(0, Math.floor(files.length * 0.2));
    
    for (const file of toDelete) {
      try {
        await unlink(join(CACHE_DIR, file.name));
      } catch {}
    }
    
    return toDelete.length;
  }
  
  // 如果大小超过限制，删除最旧的30%
  if (stats.sizeMB > MAX_CACHE_SIZE_MB) {
    const files = await readdir(CACHE_DIR);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = join(CACHE_DIR, file);
        const fileStat = await stat(filePath);
        return {
          name: file,
          size: fileStat.size,
          mtime: fileStat.mtimeMs,
        };
      })
    );
    
    // 按修改时间排序，删除最旧的30%
    fileStats.sort((a, b) => a.mtime - b.mtime);
    const toDelete = fileStats.slice(0, Math.floor(files.length * 0.3));
    
    for (const file of toDelete) {
      try {
        await unlink(join(CACHE_DIR, file.name));
      } catch {}
    }
    
    return toDelete.length;
  }
  
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');
    const statsOnly = searchParams.get('stats') === 'true';

    // 返回统计信息
    if (statsOnly) {
      const stats = await getCacheStats();
      return NextResponse.json(stats);
    }

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    await ensureCacheDir();
    
    // 每1000次请求执行清理
    requestCount++;
    if (requestCount % CLEANUP_INTERVAL === 0) {
      await cleanupExpiredCache();
      await smartCleanup();
    }

    const cacheFile = join(CACHE_DIR, getCacheFileName(url));

    // 检查缓存是否存在
    if (existsSync(cacheFile)) {
      const data = await readFile(cacheFile);
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=604800, s-maxage=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 检查缓存空间
    const stats = await getCacheStats();
    if (stats.count >= MAX_CACHE_FILES || stats.sizeMB >= MAX_CACHE_SIZE_MB) {
      await smartCleanup();
    }

    // 下载图片
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
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 });
    }

    const imageData = await response.arrayBuffer();
    
    // 检查单个文件大小（限制500KB）
    if (imageData.byteLength > 500 * 1024) {
      return new NextResponse(imageData, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=604800',
        },
      });
    }

    // 保存到缓存
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
