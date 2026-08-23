/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';
import {
  DEFAULT_SHORT_DRAMA_API,
  mapApiItemToShortDramaItem,
  SHORT_DRAMA_KEYWORDS,
} from '@/lib/shortdrama-constants';
import { getEnabledSources } from '@/lib/shortdrama-sources';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 从单个短剧源获取数据（通过分类名称查找）
async function fetchFromShortDramaSource(api: string, size: number) {
  // Step 1: 获取分类列表，找到所有短剧相关分类的ID
  const listUrl = `${api}?ac=list`;

  const listResponse = await fetch(listUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!listResponse.ok) {
    throw new Error(`HTTP error! status: ${listResponse.status}`);
  }

  const listData = await listResponse.json();
  const categories = listData.class || [];

  // 查找所有短剧相关分类
  const shortDramaCategories = categories.filter(
    (cat: any) =>
      cat.type_name &&
      SHORT_DRAMA_KEYWORDS.some((kw) => cat.type_name.includes(kw)),
  );

  if (shortDramaCategories.length === 0) {
    console.log(`该源没有短剧分类`);
    return [];
  }

  console.log(
    `找到 ${shortDramaCategories.length} 个短剧分类:`,
    shortDramaCategories
      .map((c: any) => `${c.type_name}(${c.type_id})`)
      .join(', '),
  );

  // Step 2: 从所有短剧分类获取数据
  const allItems: any[] = [];

  // 并发请求所有分类
  const categoryResults = await Promise.allSettled(
    shortDramaCategories.map(async (cat: any) => {
      const apiUrl = `${api}?ac=detail&t=${cat.type_id}&pg=1`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.list || [];
    }),
  );

  categoryResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  });

  // 按更新时间排序并去重
  const uniqueItems = Array.from(
    new Map(allItems.map((item: any) => [item.vod_name, item])).values(),
  );
  uniqueItems.sort(
    (a: any, b: any) =>
      new Date(b.vod_time || 0).getTime() - new Date(a.vod_time || 0).getTime(),
  );

  return uniqueItems
    .slice(0, size)
    .map((item) => mapApiItemToShortDramaItem(item));
}

// 从指定分类获取短剧数据
async function fetchFromShortDramaCategory(
  api: string,
  categoryId: number,
  size: number,
) {
  const apiUrl = `${api}?ac=detail&t=${categoryId}&pg=1`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const items = data.list || [];

  return items.slice(0, size).map((item) => mapApiItemToShortDramaItem(item));
}

// 服务端专用函数，从所有短剧源聚合数据
async function getRecommendedShortDramasInternal(category?: number, size = 10) {
  try {
    // 从多源配置获取所有启用的短剧源
    const enabledSources = getEnabledSources();

    // 构建源列表：先加默认源，再加其他启用的源
    const sourcesWithShortDrama: Array<{
      api: string;
      name: string;
      categoryId: number;
    }> = [];

    // 默认源（hongniuzy2.com）
    sourcesWithShortDrama.push({
      api: DEFAULT_SHORT_DRAMA_API,
      name: 'hongniuzy2',
      categoryId: 0,
    });

    // 从多源配置添加其他源
    for (const source of enabledSources) {
      if (source.api !== DEFAULT_SHORT_DRAMA_API) {
        sourcesWithShortDrama.push({
          api: source.api,
          name: source.name,
          categoryId: source.categories[0]?.id || 0,
        });
      }
    }

    console.log(`📺 找到 ${sourcesWithShortDrama.length} 个短剧源`);

    // 如果没有找到有短剧内容的源，使用默认源
    if (sourcesWithShortDrama.length === 0) {
      console.log('📺 使用默认短剧源');
      return await fetchFromShortDramaSource(DEFAULT_SHORT_DRAMA_API, size);
    }

    // 聚合所有源的数据
    const results = await Promise.allSettled(
      sourcesWithShortDrama.map((source) => {
        console.log(
          `🔄 请求短剧源: ${source.name} (分类ID: ${source.categoryId})`,
        );
        if (source.categoryId > 0) {
          return fetchFromShortDramaCategory(
            source.api,
            source.categoryId,
            size,
          );
        }
        return fetchFromShortDramaSource(source.api, size);
      }),
    );

    // 合并所有成功的结果
    const allItems: any[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(
          `✅ ${sourcesWithShortDrama[index].name}: 获取到 ${result.value.length} 条数据`,
        );
        allItems.push(...result.value);
      } else {
        console.error(
          `❌ ${sourcesWithShortDrama[index].name}: 请求失败`,
          result.reason,
        );
      }
    });

    // 去重（根据名称）
    const uniqueItems = Array.from(
      new Map(allItems.map((item) => [item.name, item])).values(),
    );

    // 按更新时间排序
    uniqueItems.sort(
      (a, b) =>
        new Date(b.update_time).getTime() - new Date(a.update_time).getTime(),
    );

    // 返回指定数量
    const finalItems = uniqueItems.slice(0, size);
    console.log(`📊 最终返回 ${finalItems.length} 条短剧数据`);

    return finalItems;
  } catch (error) {
    console.error('获取短剧推荐失败:', error);
    // 出错时fallback到默认源
    try {
      console.log('⚠️ 出错，fallback到默认源');
      return await fetchFromShortDramaSource(DEFAULT_SHORT_DRAMA_API, size);
    } catch (fallbackError) {
      console.error('默认源也失败:', fallbackError);
      return [];
    }
  }
}

// 服务端内存缓存：SSR 每次渲染都会内部调用本接口（force-no-store），
// 上游聚合耗时 1-2s，无缓存会导致 SSR 超时、首页短剧区空白
const recommendCache = new Map<string, { data: unknown; ts: number }>();
const RECOMMEND_CACHE_TTL = 5 * 60 * 1000;

// 短剧存活缓存：后台异步探测每部剧第一集链接，死剧从推荐中过滤
const dramaAliveCache = new Map<number, { alive: boolean; ts: number }>();
const DRAMA_ALIVE_TTL = 30 * 60 * 1000; // 30 分钟

/** 异步批量验证短剧第一集是否可播（不阻塞响应） */
function validateDramasAsync(
  dramas: Array<{ id: number | string; name?: string }>,
) {
  const toCheck = dramas.filter((d) => {
    const c = dramaAliveCache.get(Number(d.id));
    return !c || Date.now() - c.ts > DRAMA_ALIVE_TTL;
  });
  if (toCheck.length === 0) return;

  // 并行验证，每个限制 6 秒
  Promise.allSettled(
    toCheck.map(async (drama) => {
      try {
        const res = await fetch(
          `${process.env.SITE_BASE || 'http://127.0.0.1:' + (process.env.PORT || 3000)}/api/shortdrama/detail?id=${drama.id}&episode=1`,
          { signal: AbortSignal.timeout(6000) },
        );
        if (!res.ok) {
          dramaAliveCache.set(Number(drama.id), {
            alive: false,
            ts: Date.now(),
          });
          return;
        }
        const data = await res.json();
        const ep1 = data.episodes?.[0];
        if (!ep1) {
          dramaAliveCache.set(Number(drama.id), {
            alive: false,
            ts: Date.now(),
          });
          return;
        }
        // 探测分片代理是否能拿到内容
        const probe = await fetch(
          `/api/proxy/m3u8?url=${encodeURIComponent(ep1)}`,
          { signal: AbortSignal.timeout(6000) },
        );
        const alive = probe.ok && (await probe.text()).includes('#EXTM3U');
        try {
          await probe.body?.cancel();
        } catch {}
        dramaAliveCache.set(Number(drama.id), {
          alive,
          ts: Date.now(),
        });
      } catch {
        // 探测失败不算死，可能是暂时性网络问题
      }
    }),
  ).then(() => {
    // 清理过期条目
    if (dramaAliveCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of dramaAliveCache) {
        if (now - v.ts > DRAMA_ALIVE_TTL) dramaAliveCache.delete(k);
      }
    }
  });
}

/** 过滤掉已确认死亡的短剧 */
function filterDeadDramas<T extends { id: number | string }>(dramas: T[]): T[] {
  if (dramaAliveCache.size === 0) return dramas;
  return dramas.filter((d) => {
    const c = dramaAliveCache.get(Number(d.id));
    if (!c) return true; // 未验证的保留
    if (Date.now() - c.ts > DRAMA_ALIVE_TTL) return true; // 过期重新展示
    return c.alive;
  });
}

export async function GET(request: NextRequest) {
  const cacheKey = request.url;
  const cachedEntry = recommendCache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.ts < RECOMMEND_CACHE_TTL) {
    // 缓存命中也要过滤死剧
    const data = Array.isArray(cachedEntry.data)
      ? filterDeadDramas(cachedEntry.data as Array<{ id: number | string }>)
      : cachedEntry.data;
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'X-Memory-Cache': 'HIT',
      },
    });
  }

  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  resetDbQueryCount();

  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const size = searchParams.get('size');

    const categoryNum = category ? parseInt(category) : undefined;
    const pageSize = size ? parseInt(size) : 10;

    if ((category && isNaN(categoryNum!)) || isNaN(pageSize)) {
      const errorResponse = { error: '参数格式错误' };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/recommend',
        statusCode: 400,
        duration: Date.now() - startTime,
        memoryUsed:
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        dbQueries: getDbQueryCount(),
        requestSize: 0,
        responseSize,
      });

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const result = await getRecommendedShortDramasInternal(
      categoryNum,
      pageSize,
    );

    // 写入内存缓存（限大小防泄漏）
    if (recommendCache.size > 20) {
      const oldest = recommendCache.keys().next().value;
      if (oldest) recommendCache.delete(oldest);
    }
    recommendCache.set(cacheKey, { data: result, ts: Date.now() });

    // 过滤已确认死亡的短剧
    const filtered = Array.isArray(result)
      ? filterDeadDramas(result as Array<{ id: number | string }>)
      : result;

    // 后台异步验活（不阻塞本次响应，下次请求生效）
    if (Array.isArray(result) && result.length > 0) {
      validateDramasAsync(result as Array<{ id: number | string }>);
    }

    // 测试1小时HTTP缓存策略
    const response = NextResponse.json(filtered);

    console.log('🕐 [RECOMMEND] 设置1小时HTTP缓存 - 测试自动过期刷新');

    // 1小时 = 3600秒
    const cacheTime = 3600;
    response.headers.set(
      'Cache-Control',
      `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    );
    response.headers.set('CDN-Cache-Control', `public, s-maxage=${cacheTime}`);
    response.headers.set(
      'Vercel-CDN-Cache-Control',
      `public, s-maxage=${cacheTime}`,
    );

    // 调试信息
    response.headers.set('X-Cache-Duration', '1hour');
    response.headers.set(
      'X-Cache-Expires-At',
      new Date(Date.now() + cacheTime * 1000).toISOString(),
    );
    response.headers.set('X-Debug-Timestamp', new Date().toISOString());

    // Vary头确保不同设备有不同缓存
    response.headers.set('Vary', 'Accept-Encoding, User-Agent');

    // 记录性能指标
    const responseSize = Buffer.byteLength(JSON.stringify(result), 'utf8');
    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/recommend',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
    });

    return response;
  } catch (error) {
    console.error('获取推荐短剧失败:', error);

    const errorResponse = { error: '服务器内部错误' };
    const responseSize = Buffer.byteLength(
      JSON.stringify(errorResponse),
      'utf8',
    );

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/recommend',
      statusCode: 500,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
