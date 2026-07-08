/**
 * Poster Cache API - 按内容ID缓存
 * 每个影片只保留一张最新海报，节省空间
 * 当有新海报时自动替换旧的
 */

import { existsSync } from 'fs';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

export const runtime = 'nodejs';

const CACHE_DIR = join(process.cwd(), 'public', 'poster-cache');
const MAX_CACHE_SIZE_MB = 1500;
const MAX_CACHE_FILES = 30000;

async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

/**
 * 从URL提取内容ID
 * 豆瓣: /view/photo/s_ratio_poster/public/p2929038414.jpg → p2929038414
 * 通用: 使用URL的最后部分作为ID
 */
function getContentId(url: string): string {
  // 豆瓣图片URL格式: https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2929038414.jpg
  const doubanMatch = url.match(/\/public\/(p\d+)\./);
  if (doubanMatch) {
    return doubanMatch[1]; // p2929038414
  }

  // manmankan格式: /yybpic/202401/xxx.jpg
  const manmankanMatch = url.match(/\/([^/]+)\.(jpg|jpeg|png|webp)/i);
  if (manmankanMatch) {
    return manmankanMatch[1];
  }

  // 通用: 使用URL的hash
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

function getReferer(url: string): string {
  if (url.includes('doubanio.com') || url.includes('douban.com')) {
    return 'https://movie.douban.com/';
  }
  if (url.includes('manmankan.com')) {
    return 'https://www.manmankan.com/';
  }
  return '';
}

/**
 * 保存海报并管理旧文件
 * 同一个contentId的新海报会自动替换旧的
 */
async function savePoster(
  contentId: string,
  imageData: ArrayBuffer,
  url: string,
): Promise<string | null> {
  try {
    // 根据内容类型确定扩展名
    let ext = '.jpg';
    if (url.includes('.webp')) ext = '.webp';
    else if (url.includes('.png')) ext = '.png';

    const fileName = `${contentId}${ext}`;
    const filePath = join(CACHE_DIR, fileName);

    // 如果同ID的旧文件存在，删除它（新海报替换旧的）
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch {}
    }

    // 保存新海报
    await writeFile(filePath, Buffer.from(imageData));
    return fileName;
  } catch (error) {
    // 文件写入失败时返回null，API仍会返回图片数据
    console.warn('Failed to save poster:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    await ensureCacheDir();

    // 按内容ID获取缓存文件名
    const contentId = getContentId(url);
    const ext = url.includes('.webp')
      ? '.webp'
      : url.includes('.png')
        ? '.png'
        : '.jpg';
    const cacheFile = join(CACHE_DIR, `${contentId}${ext}`);

    // 检查缓存是否存在
    if (existsSync(cacheFile)) {
      const data = await readFile(cacheFile);
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=604800, s-maxage=604800',
          'Access-Control-Allow-Origin': '*',
          Vary: '',
        },
      });
    }

    // 检查缓存空间
    const files = await readdir(CACHE_DIR);
    if (files.length >= MAX_CACHE_FILES) {
      // 删除最旧的10%文件
      const fileStats = await Promise.all(
        files.map(async (f) => ({
          name: f,
          mtime: (await stat(join(CACHE_DIR, f))).mtimeMs,
        })),
      );
      fileStats.sort((a, b) => a.mtime - b.mtime);
      const toDelete = fileStats.slice(0, Math.floor(files.length * 0.1));
      for (const f of toDelete) {
        try {
          await unlink(join(CACHE_DIR, f.name));
        } catch {}
      }
    }

    // 下载图片
    const referer = getReferer(url);
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: referer,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed' }, { status: 502 });
    }

    const imageData = await response.arrayBuffer();

    // 保存海报（自动替换同ID旧文件）
    await savePoster(contentId, imageData, url);

    return new NextResponse(imageData, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800',
        'Access-Control-Allow-Origin': '*',
        Vary: '',
      },
    });
  } catch (error) {
    console.error('Poster cache error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
