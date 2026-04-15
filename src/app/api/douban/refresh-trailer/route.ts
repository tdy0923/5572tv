import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { recordRequest } from '@/lib/performance-monitor';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

const TRAILER_FAILURE_CACHE_TTL = 10 * 60;
const TRAILER_SUCCESS_CACHE_TTL = 30 * 60;

function getTrailerFailureCacheKey(id: string): string {
  return `douban:trailer:refresh-failure:${id}`;
}

function getTrailerSuccessCacheKey(id: string): string {
  return `douban:trailer:refresh-success:${id}`;
}

async function cacheTrailerRefreshFailure(
  id: string,
  payload: unknown,
): Promise<void> {
  try {
    await db.setCache(
      getTrailerFailureCacheKey(id),
      payload,
      TRAILER_FAILURE_CACHE_TTL,
    );
  } catch {
    // 缓存失败不影响主流程
  }
}

async function clearTrailerRefreshFailure(id: string): Promise<void> {
  try {
    await db.deleteCache(getTrailerFailureCacheKey(id));
  } catch {
    // 缓存清理失败不影响主流程
  }
}

async function cacheTrailerRefreshSuccess(
  id: string,
  payload: unknown,
): Promise<void> {
  try {
    await db.setCache(
      getTrailerSuccessCacheKey(id),
      payload,
      TRAILER_SUCCESS_CACHE_TTL,
    );
  } catch {
    // 缓存失败不影响主流程
  }
}

/**
 * 刷新过期的 Douban trailer URL
 * 不使用任何缓存，直接调用豆瓣移动端API获取最新URL
 */

async function fetchTrailerFromEndpoint(
  endpoint: 'movie' | 'tv',
  id: string,
): Promise<string | null> {
  const TIMEOUT = 20000;
  const mobileApiUrl = `https://m.douban.com/rexxar/api/v2/${endpoint}/${id}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(mobileApiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Referer: 'https://movie.douban.com/explore',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        Origin: 'https://movie.douban.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
      },
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`豆瓣API返回错误: ${response.status}`);
    }

    const data = await response.json();
    return data.trailers?.[0]?.video_url || null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 带重试的获取函数
async function fetchTrailerWithRetry(
  id: string,
  retryCount = 0,
): Promise<string | null> {
  const MAX_RETRIES = 2;
  const TIMEOUT = 20000; // 20秒超时
  const RETRY_DELAY = 2000; // 2秒后重试

  const startTime = Date.now();

  try {
    const trailerUrl =
      (await fetchTrailerFromEndpoint('movie', id)) ||
      (await fetchTrailerFromEndpoint('tv', id));

    if (!trailerUrl) {
      throw new Error('该影片没有预告片');
    }

    return trailerUrl;
  } catch (error) {
    const failTime = Date.now() - startTime;

    // 超时或网络错误，尝试重试
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('fetch'))
    ) {
      if (retryCount < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchTrailerWithRetry(id, retryCount + 1);
      }
    } else {
      console.error(
        `[refresh-trailer] 影片 ${id} 发生错误 (耗时: ${failTime}ms):`,
        error,
      );
    }

    throw error;
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    const errorResponse = {
      code: 400,
      message: '缺少必要参数: id',
      error: 'MISSING_PARAMETER',
    };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/refresh-trailer',
      statusCode: 400,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 400 });
  }

  try {
    const successCacheKey = getTrailerSuccessCacheKey(id);
    const cachedSuccess = await db.getCache(successCacheKey);
    if (cachedSuccess) {
      return NextResponse.json(cachedSuccess, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    const failureCacheKey = getTrailerFailureCacheKey(id);
    const cachedFailure = await db.getCache(failureCacheKey);
    if (cachedFailure) {
      return NextResponse.json(cachedFailure, {
        status: cachedFailure.code === 404 ? 404 : 429,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    const trailerUrl = await fetchTrailerWithRetry(id);
    await clearTrailerRefreshFailure(id);

    const successResponse = {
      code: 200,
      message: '获取成功',
      data: {
        trailerUrl,
      },
    };
    const responseSize = Buffer.byteLength(
      JSON.stringify(successResponse),
      'utf8',
    );

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/refresh-trailer',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize,
    });

    await cacheTrailerRefreshSuccess(id, successResponse);

    return NextResponse.json(successResponse, {
      headers: {
        // 不缓存这个 API 的响应
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      // 超时错误
      if (error.name === 'AbortError') {
        const timeoutResponse = {
          code: 504,
          message: '请求超时，豆瓣响应过慢',
          error: 'TIMEOUT',
        };
        const timeoutSize = Buffer.byteLength(
          JSON.stringify(timeoutResponse),
          'utf8',
        );

        recordRequest({
          timestamp: startTime,
          method: 'GET',
          path: '/api/douban/refresh-trailer',
          statusCode: 504,
          duration: Date.now() - startTime,
          memoryUsed:
            (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
          dbQueries: 0,
          requestSize: 0,
          responseSize: timeoutSize,
        });

        return NextResponse.json(timeoutResponse, { status: 504 });
      }

      // 没有预告片
      if (error.message.includes('没有预告片')) {
        const noTrailerResponse = {
          code: 404,
          message: error.message,
          error: 'NO_TRAILER',
        };
        const noTrailerSize = Buffer.byteLength(
          JSON.stringify(noTrailerResponse),
          'utf8',
        );

        recordRequest({
          timestamp: startTime,
          method: 'GET',
          path: '/api/douban/refresh-trailer',
          statusCode: 404,
          duration: Date.now() - startTime,
          memoryUsed:
            (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
          dbQueries: 0,
          requestSize: 0,
          responseSize: noTrailerSize,
        });

        await cacheTrailerRefreshFailure(id, noTrailerResponse);

        return NextResponse.json(noTrailerResponse, { status: 404 });
      }

      // 其他错误
      const fetchErrorResponse = {
        code: 500,
        message: '刷新 trailer URL 失败',
        error: 'FETCH_ERROR',
        details: error.message,
      };
      const fetchErrorSize = Buffer.byteLength(
        JSON.stringify(fetchErrorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/douban/refresh-trailer',
        statusCode: 500,
        duration: Date.now() - startTime,
        memoryUsed:
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        dbQueries: 0,
        requestSize: 0,
        responseSize: fetchErrorSize,
      });

      await cacheTrailerRefreshFailure(id, {
        code: 429,
        message: 'trailer 刷新暂时不可用，请稍后重试',
        error: 'TRAILER_REFRESH_TEMP_UNAVAILABLE',
      });

      return NextResponse.json(fetchErrorResponse, { status: 500 });
    }

    const unknownErrorResponse = {
      code: 500,
      message: '刷新 trailer URL 失败',
      error: 'UNKNOWN_ERROR',
    };
    const unknownErrorSize = Buffer.byteLength(
      JSON.stringify(unknownErrorResponse),
      'utf8',
    );

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/refresh-trailer',
      statusCode: 500,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize: unknownErrorSize,
    });

    await cacheTrailerRefreshFailure(id, {
      code: 429,
      message: 'trailer 刷新暂时不可用，请稍后重试',
      error: 'TRAILER_REFRESH_TEMP_UNAVAILABLE',
    });

    return NextResponse.json(unknownErrorResponse, { status: 500 });
  }
}
