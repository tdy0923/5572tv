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
const _MAX_CACHE_SIZE_MB = 1500;
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
  // 必须把尺寸变体段（l / s_ratio_poster / m_ratio_poster / s / sqxs ...）并入 key，
  // 否则同一 pNNN 的横图与竖图会共用缓存文件互相覆盖，返回错误尺寸的海报。
  const doubanMatch = url.match(/\/view\/photo\/([^/]+)\/public\/(p\d+)\./);
  if (doubanMatch) {
    return `${doubanMatch[2]}_${doubanMatch[1]}`; // p2929038414_s_ratio_poster
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
 * 海报下载调度：并发限流 + 同 URL 去重 + 失败重试
 * 豆瓣图片源对高并发断连敏感，8 并发为安全上限；上次提至 12 导致与
 * m3u8 探活并发叠加耗尽浏览器 socket（ERR_INSUFFICIENT_RESOURCES），回退至 6。
 */
const MAX_CONCURRENT_DOWNLOADS = 6;
const DOWNLOAD_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 300;
const MAX_DOWNLOAD_ATTEMPTS = 3;
// 豆瓣对服务器 IP 偶发限流会返回这些瞬时状态；旧代码 !ok 直接放弃导致偶发空白，
// 这里对瞬时状态带退避+抖动重试，仅对 404 等永久错误快速放弃。
const TRANSIENT_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504]);

const inflight = new Map<string, Promise<ArrayBuffer | null>>();
let activeDownloads = 0;
const downloadQueue: Array<{
  url: string;
  resolve: (data: ArrayBuffer | null) => void;
}> = [];

async function downloadOnce(url: string): Promise<ArrayBuffer | null> {
  const referer = getReferer(url);
  for (let attempt = 0; attempt < MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: referer,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (response.ok) {
        return await response.arrayBuffer();
      }
      const transient = TRANSIENT_STATUSES.has(response.status);
      try {
        await response.body?.cancel();
      } catch {}
      // 永久错误（404 等）立即放弃；瞬时错误进入下面的退避重试
      if (!transient || attempt === MAX_DOWNLOAD_ATTEMPTS - 1) return null;
    } catch {
      // 网络异常/超时：最后一次仍失败则放弃
      if (attempt === MAX_DOWNLOAD_ATTEMPTS - 1) return null;
    }
    await new Promise((r) =>
      setTimeout(r, RETRY_DELAY_MS * (attempt + 1) + Math.random() * 250),
    );
  }
  return null;
}

function pumpQueue() {
  while (
    activeDownloads < MAX_CONCURRENT_DOWNLOADS &&
    downloadQueue.length > 0
  ) {
    const next = downloadQueue.shift()!;
    activeDownloads++;
    downloadOnce(next.url)
      .then(next.resolve)
      .finally(() => {
        activeDownloads--;
        pumpQueue();
      });
  }
}

function queueDownload(url: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    downloadQueue.push({ url, resolve });
    pumpQueue();
  });
}

async function getImageData(url: string): Promise<ArrayBuffer | null> {
  const existing = inflight.get(url);
  if (existing) return existing;
  const p = queueDownload(url).finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
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

    // 下载图片（并发限流 + 去重 + 重试）
    const imageData = await getImageData(url);

    if (!imageData) {
      // 502 会让浏览器直接白屏；改 302 跳 image-proxy 透传，客户端仍有机会拿到图。
      // 注意：NextResponse.redirect 必须用绝对 URL，相对 URL 会抛错导致 500（旧 bug）。
      return NextResponse.redirect(
        new URL(`/api/image-proxy?url=${encodeURIComponent(url)}`, request.url),
        302,
      );
    }

    // 保存海报（自动替换同ID旧文件）
    await savePoster(contentId, imageData, url);

    return new NextResponse(imageData, {
      headers: {
        'Content-Type': 'image/jpeg',
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
