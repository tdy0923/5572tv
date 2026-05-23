/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { searchFromApi } from '@/lib/downstream';
import { generateSearchVariants } from '@/lib/downstream';
import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';

function getSearchCacheKey(username: string, query: string) {
  return `search:${username}:${query.trim().toLowerCase()}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  resetDbQueryCount();

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    const errorResponse = { error: 'Unauthorized' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/search',
      statusCode: 401,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 401 });
  }

  // 检查用户是否允许成人内容（VIP 用户不受限）
  const userInfo = await db.getUserInfoV2(authInfo.username).catch(() => null);
  const showAdultContent = userInfo?.showAdultContent === true;

  const ADULT_PATTERNS =
    /^(AV-|成人|伦理|福利|里番|R18|色情|情色|三级|性感|裸|性爱|艳情|18禁)/i;
  const ADULT_SUBSTRINGS =
    /伦理片|伦理电影|福利片|福利视频|里番动漫|门事件|日本无码|国产传媒|淫|色片|色图|情色片/i;
  const isAdultResult = (r: any) => {
    if (showAdultContent) return false;
    const fields = [r.title, r.class, r.type_name, r.source_name].filter(
      Boolean,
    );
    return fields.some(
      (f: string) => ADULT_PATTERNS.test(f) || ADULT_SUBSTRINGS.test(f),
    );
  };

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    const successResponse = { results: [] };
    const responseSize = Buffer.byteLength(
      JSON.stringify(successResponse),
      'utf8',
    );

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/search',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
      filter: 'empty-query',
    });

    return NextResponse.json(successResponse, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);
  const cacheTime = await getCacheTime();
  const searchCacheTtl = Math.max(15, Math.min(cacheTime, 120));
  const searchCacheKey = getSearchCacheKey(authInfo.username, query);

  try {
    const cachedResults = await db.getCache(searchCacheKey);
    if (Array.isArray(cachedResults) && cachedResults.length > 0) {
      const successResponse = { results: cachedResults };
      const responseSize = Buffer.byteLength(
        JSON.stringify(successResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/search',
        statusCode: 200,
        duration: Date.now() - startTime,
        memoryUsed:
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        dbQueries: getDbQueryCount(),
        requestSize: 0,
        responseSize,
        filter: `query:${query}|cache:hit`,
      });

      return NextResponse.json(successResponse, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      });
    }
  } catch (error) {
    console.warn('读取搜索缓存失败:', error);
  }

  // 优化：预计算搜索变体，智能生成（普通查询1个，需要变体的2个）
  const searchVariants = generateSearchVariants(query);

  // 添加超时控制和错误处理，避免慢接口拖累整体响应
  const SEARCH_TIMEOUT = 20_000;

  const searchPromises = apiSites.map((site) =>
    Promise.race([
      searchFromApi(site, query, searchVariants),
      new Promise<[]>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${site.name} timeout`)),
          SEARCH_TIMEOUT,
        ),
      ),
    ]).catch(() => []),
  );

  // 🎯 兜底方案：3秒内收集已有结果提前返回，不等待全部
  const EARLY_RETURN_WAIT = 3_000;

  try {
    // 等待 3 秒，收集所有在这段时间内返回的结果
    const [aggregated] = await Promise.all([
      new Promise<any[]>((resolve) => {
        const collected: any[] = [];
        let done = false;
        for (const p of searchPromises) {
          p.then((r) => {
            if (done) return;
            if (r.length > 0) collected.push(...r);
          });
        }
        setTimeout(() => {
          done = true;
          resolve(collected);
        }, EARLY_RETURN_WAIT);
      }),
    ]);

    if (aggregated.length > 0) {
      let earlyResults = aggregated;
      if (!config.SiteConfig.DisableYellowFilter) {
        earlyResults = aggregated.filter(
          (r: any) =>
            !isAdultResult(r) &&
            !yellowWords.some((word: string) =>
              (r.type_name || '').includes(word),
            ),
        );
      }
      // 后台继续收集其余源并写入缓存
      Promise.allSettled(searchPromises).then((all) => {
        const allSuccess = all
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (r as PromiseFulfilledResult<any>).value)
          .flat();
        if (allSuccess.length > 0) {
          db.setCache(searchCacheKey, allSuccess, searchCacheTtl).catch(
            () => {},
          );
        }
      });
      return NextResponse.json(
        { results: earlyResults },
        {
          headers: {
            'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
            'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          },
        },
      );
    }

    // 5 秒内无结果，等全部返回
    const results = await Promise.allSettled(searchPromises);
    const successResults = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value);
    let flattenedResults = successResults.flat();
    if (!config.SiteConfig.DisableYellowFilter) {
      flattenedResults = flattenedResults.filter(
        (result) =>
          !isAdultResult(result) &&
          !yellowWords.some((word: string) =>
            (result.type_name || '').includes(word),
          ),
      );
    }
    if (flattenedResults.length === 0) {
      // no cache if empty
      const emptyResponse = { results: [] };
      const responseSize = Buffer.byteLength(
        JSON.stringify(emptyResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/search',
        statusCode: 200,
        duration: Date.now() - startTime,
        memoryUsed:
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        dbQueries: getDbQueryCount(),
        requestSize: 0,
        responseSize,
        filter: `query:${query}`,
      });

      return NextResponse.json(emptyResponse, { status: 200 });
    }

    const successResponse = { results: flattenedResults };
    const responseSize = Buffer.byteLength(
      JSON.stringify(successResponse),
      'utf8',
    );

    try {
      await db.setCache(searchCacheKey, flattenedResults, searchCacheTtl);
    } catch (error) {
      console.warn('写入搜索缓存失败:', error);
    }

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/search',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
      filter: `query:${query}`,
    });

    return NextResponse.json(successResponse, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    const errorResponse = { error: '搜索失败' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/search',
      statusCode: 500,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
