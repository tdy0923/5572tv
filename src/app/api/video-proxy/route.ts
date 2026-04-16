import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { NextResponse } from 'next/server';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';
import {
  cacheTrailerUrl,
  cacheVideoContent,
  deleteVideoCache,
  getCachedVideoPath,
  isVideoCached,
} from '@/lib/video-cache';

export const runtime = 'nodejs';
const MAX_CACHEABLE_VIDEO_SIZE = 80 * 1024 * 1024;

/**
 * 从豆瓣视频 URL 中提取 douban_id
 * 例如：从 localStorage 或 HeroBanner 的 refreshedTrailerUrls 中获取映射关系
 */
function extractDoubanIdFromReferer(request: Request): string | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;

  // 从 referer 中提取 douban_id（如果有的话）
  const match = referer.match(/douban_id=(\d+)/);
  return match ? match[1] : null;
}

// 视频代理接口 - 支持流式传输和Range请求
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing video URL' }, { status: 400 });
  }

  // URL 格式验证
  try {
    new URL(videoUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // 🎯 优先检查缓存（Kvrocks + 文件系统）
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;
  if (storageType === 'kvrocks') {
    try {
      const cached = await isVideoCached(videoUrl);
      if (cached) {
        const cachedPath = await getCachedVideoPath(videoUrl);
        if (cachedPath) {
          return serveVideoFromFile(cachedPath, request);
        }
      }
    } catch (error) {
      console.warn('[VideoProxy] 缓存检查失败，降级到直接代理:', error);
    }
  }

  // 获取客户端的 Range 请求头
  const rangeHeader = request.headers.get('range');
  // 获取条件请求头（用于缓存重验证）
  const ifNoneMatch = request.headers.get('if-none-match');
  const ifModifiedSince = request.headers.get('if-modified-since');

  // 🎯 仅对 Kvrocks + 豆瓣视频的完整响应启用缓存，避免 Range 请求拖垮服务器
  const isCacheCandidate =
    storageType === 'kvrocks' &&
    (videoUrl.includes('douban') || videoUrl.includes('doubanio'));

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

  try {
    // 动态设置 Referer 和 Origin（根据视频源域名）
    const videoUrlObj = new URL(videoUrl);
    const sourceOrigin = `${videoUrlObj.protocol}//${videoUrlObj.host}`;

    // 构建请求头
    const fetchHeaders: HeadersInit = {
      Referer: sourceOrigin + '/',
      Origin: sourceOrigin,
      'User-Agent': DEFAULT_USER_AGENT,
      Accept:
        'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity;q=1, *;q=0',
      Connection: 'keep-alive',
    };

    // Range 请求始终透传给上游，避免为了一个 seek 请求下载完整视频
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    // 转发条件请求头（用于缓存重验证）
    if (ifNoneMatch) {
      fetchHeaders['If-None-Match'] = ifNoneMatch;
    }
    if (ifModifiedSince) {
      fetchHeaders['If-Modified-Since'] = ifModifiedSince;
    }

    const videoResponse = await fetch(videoUrl, {
      signal: controller.signal,
      headers: fetchHeaders,
    });

    clearTimeout(timeoutId);

    // 处理 304 Not Modified（缓存重验证成功）
    if (videoResponse.status === 304) {
      const headers = new Headers();
      const etag = videoResponse.headers.get('etag');
      const lastModified = videoResponse.headers.get('last-modified');

      if (etag) headers.set('ETag', etag);
      if (lastModified) headers.set('Last-Modified', lastModified);

      headers.set(
        'Cache-Control',
        'public, max-age=1800, stale-while-revalidate=900, must-revalidate',
      );
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(null, {
        status: 304,
        headers,
      });
    }

    if (!videoResponse.ok) {
      // 🎯 如果是 403/404 等错误，删除可能过期的缓存
      if (
        storageType === 'kvrocks' &&
        (videoResponse.status === 403 || videoResponse.status === 404)
      ) {
        deleteVideoCache(videoUrl).catch((err) => {
          console.warn('[VideoProxy] 删除缓存失败:', err);
        });
      }

      const errorResponse = NextResponse.json(
        {
          error: 'Failed to fetch video',
          status: videoResponse.status,
          statusText: videoResponse.statusText,
          stale: videoResponse.status === 403 || videoResponse.status === 404,
        },
        { status: videoResponse.status },
      );
      // 错误响应不缓存，避免缓存失效的视频链接
      errorResponse.headers.set(
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      );
      return errorResponse;
    }

    if (!videoResponse.body) {
      return NextResponse.json(
        { error: 'Video response has no body' },
        { status: 500 },
      );
    }

    const contentType = videoResponse.headers.get('content-type');
    const contentLength = videoResponse.headers.get('content-length');
    const contentRange = videoResponse.headers.get('content-range');
    const acceptRanges = videoResponse.headers.get('accept-ranges');
    const etag = videoResponse.headers.get('etag');
    const lastModified = videoResponse.headers.get('last-modified');

    // 创建响应头
    const headers = new Headers();
    if (contentType) headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentRange) headers.set('Content-Range', contentRange);
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
    if (etag) headers.set('ETag', etag);
    if (lastModified) headers.set('Last-Modified', lastModified);

    // 设置缓存头（视频30分钟缓存 + 智能重验证）
    // 使用 stale-while-revalidate 策略：允许在后台重新验证时提供旧内容
    // 但添加 must-revalidate 确保过期后必须验证源服务器
    // trailer URL 有时效性，使用较短的 30 分钟缓存
    headers.set(
      'Cache-Control',
      'public, max-age=1800, stale-while-revalidate=900, must-revalidate',
    );
    // CDN缓存：30分钟 + 15分钟宽限期
    headers.set(
      'CDN-Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=900',
    );

    // 添加 CORS 支持
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');

    // 返回正确的状态码：Range请求返回206，完整请求返回200
    const statusCode = rangeHeader && contentRange ? 206 : 200;

    const parsedContentLength = contentLength
      ? parseInt(contentLength, 10)
      : NaN;
    const canCacheResponse =
      isCacheCandidate &&
      !rangeHeader &&
      !contentRange &&
      videoResponse.body &&
      Number.isFinite(parsedContentLength) &&
      parsedContentLength > 0 &&
      parsedContentLength <= MAX_CACHEABLE_VIDEO_SIZE;

    // 🎯 只缓存小体积完整响应，兼顾首播流畅与弱服务器稳定性
    if (canCacheResponse) {
      const cacheResponse = videoResponse.clone();

      void (async () => {
        try {
          const videoBuffer = Buffer.from(await cacheResponse.arrayBuffer());
          await cacheVideoContent(
            videoUrl,
            videoBuffer,
            contentType || 'video/mp4',
          );

          const doubanId = extractDoubanIdFromReferer(request);
          if (doubanId) {
            await cacheTrailerUrl(doubanId, videoUrl);
          }
        } catch (error) {
          console.warn(
            '[VideoProxy] 后台缓存视频失败，已降级为直接回源:',
            error,
          );
        }
      })();

      return new Response(videoResponse.body, {
        status: statusCode,
        headers,
      });
    }

    // 直接返回视频流（Range 请求或缓存失败）
    return new Response(videoResponse.body, {
      status: statusCode,
      headers,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);

    // 错误类型判断
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Video fetch timeout (30s)' },
        { status: 504 },
      );
    }

    console.warn('[Video Proxy] Error fetching video:', error.message);
    return NextResponse.json(
      { error: 'Error fetching video', details: error.message },
      { status: 500 },
    );
  }
}

// 处理 HEAD 请求（用于获取视频元数据）
export async function HEAD(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    // 动态设置 Referer 和 Origin（根据视频源域名）
    const videoUrlObj = new URL(videoUrl);
    const sourceOrigin = `${videoUrlObj.protocol}//${videoUrlObj.host}`;

    const videoResponse = await fetch(videoUrl, {
      method: 'HEAD',
      headers: {
        Referer: sourceOrigin + '/',
        Origin: sourceOrigin,
        'User-Agent': DEFAULT_USER_AGENT,
        Accept:
          'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity;q=1, *;q=0',
        Connection: 'keep-alive',
      },
    });

    const headers = new Headers();
    const contentType = videoResponse.headers.get('content-type');
    const contentLength = videoResponse.headers.get('content-length');
    const acceptRanges = videoResponse.headers.get('accept-ranges');
    const etag = videoResponse.headers.get('etag');
    const lastModified = videoResponse.headers.get('last-modified');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', contentLength);
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
    if (etag) headers.set('ETag', etag);
    if (lastModified) headers.set('Last-Modified', lastModified);

    headers.set('Access-Control-Allow-Origin', '*');
    headers.set(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=1800, must-revalidate',
    );

    return new NextResponse(null, {
      status: videoResponse.status,
      headers,
    });
  } catch (error: any) {
    console.error('[Video Proxy] HEAD request error:', error.message);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * 从缓存文件返回视频（支持 Range 请求）
 */
async function serveVideoFromFile(
  filePath: string,
  request: Request,
): Promise<Response> {
  const rangeHeader = request.headers.get('range');
  const stats = await fs.stat(filePath);
  const fileSize = stats.size;

  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=7200', // 2小时缓存
  });

  // 处理 Range 请求
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    headers.set('Content-Length', chunkSize.toString());

    const fileStream = createReadStream(filePath, { start, end });

    return new Response(fileStream as any, {
      status: 206,
      headers,
    });
  }

  // 完整文件请求
  headers.set('Content-Length', fileSize.toString());
  const fileStream = createReadStream(filePath);

  return new Response(fileStream as any, {
    status: 200,
    headers,
  });
}

// 处理 CORS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
