/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
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

  return uniqueItems.slice(0, size).map(mapApiItemToShortDramaItem);
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

  return items.slice(0, size).map(mapApiItemToShortDramaItem);
}

// 服务端专用函数，从所有短剧源聚合数据
async function getRecommendedShortDramasInternal(category?: number, size = 10) {
  try {
    // 获取配置
    const config = await getConfig();

    // 筛选出所有启用的短剧源（type === 'shortdrama'）
    const shortDramaSources = config.SourceConfig.filter(
      (source) => source.type === 'shortdrama' && !source.disabled,
    );

    // 同时检查普通源中是否有短剧分类
    const regularSources = config.SourceConfig.filter(
      (source) => !source.disabled && source.type !== 'shortdrama',
    );

    console.log(
      `📺 找到 ${shortDramaSources.length} 个短剧源, ${regularSources.length} 个普通源`,
    );

    // 收集所有有短剧分类的源
    const sourcesWithShortDrama: Array<{
      api: string;
      name: string;
      categoryId: number;
    }> = [];

    // 只使用默认源作为默认源（确保ID与parse API兼容）
    sourcesWithShortDrama.push({
      api: DEFAULT_SHORT_DRAMA_API,
      name: 'hongniuzy2',
      categoryId: 0,
    });

    console.log(`📺 使用默认短剧源: hongniuzy2.com`);

    console.log(`📺 找到 ${sourcesWithShortDrama.length} 个有短剧内容的源`);

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

export async function GET(request: NextRequest) {
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

    // 测试1小时HTTP缓存策略
    const response = NextResponse.json(result);

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
