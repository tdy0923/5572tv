import { NextRequest, NextResponse } from 'next/server';

import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';
import {
  mapApiItemToShortDramaItem,
  SHORTDRAMA_CACHE_SECONDS,
} from '@/lib/shortdrama-constants';
import {
  getAllShortDramaSources,
  ShortDramaSource,
} from '@/lib/shortdrama-sources';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 从指定分类获取短剧列表
async function fetchListFromCategory(
  api: string,
  categoryId: number,
  page: number,
  size: number,
) {
  const apiUrl = `${api}?ac=detail&t=${categoryId}&pg=${page}`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return { list: [], hasMore: false };
  }

  const data = await response.json();
  const items = data.list || [];

  const limitedItems = items.slice(0, size);

  const list = limitedItems.map((item: any) =>
    mapApiItemToShortDramaItem(item, api),
  );

  return {
    list,
    hasMore: data.page < data.pagecount,
  };
}

// 服务端专用函数，从多个源聚合数据
async function getShortDramaListInternal(
  category: number,
  categoryName?: string,
  page = 1,
  size = 20,
) {
  try {
    // 找到包含此分类的所有源（含主源自动发现）
    const allSources = await getAllShortDramaSources();

    // 优先按分类名称解析（同一名称在不同源可能有不同ID）
    let targetName = categoryName || '';
    if (!targetName) {
      for (const source of allSources) {
        const match = source.categories.find((c) => c.id === category);
        if (match) {
          targetName = match.name;
          break;
        }
      }
    }

    // 按分类名称匹配所有源，并使用每个源自己的分类ID查询
    let sourcesToQuery: ShortDramaSource[];
    if (targetName) {
      sourcesToQuery = allSources.filter(
        (source) =>
          source.enabled &&
          source.categories.some((c) => c.name === targetName),
      );
    } else {
      // 未找到分类名时退化为按ID匹配；再无则用全部启用的源
      sourcesToQuery = allSources.filter(
        (source) =>
          source.enabled && source.categories.some((c) => c.id === category),
      );
      if (sourcesToQuery.length === 0) {
        sourcesToQuery = allSources.filter((s) => s.enabled);
      }
    }

    // 并行从所有源获取数据
    const results = await Promise.allSettled(
      sourcesToQuery.map((source) => {
        // 使用该源下同名分类的ID
        const targetCategory = targetName
          ? source.categories.find((c) => c.name === targetName)?.id
          : undefined;
        const catId = targetCategory !== undefined ? targetCategory : category;
        return fetchListFromCategory(source.api, catId, page, size);
      }),
    );

    // 合并所有成功的结果
    const allItems: any[] = [];
    let hasMore = false;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value.list);
        if (result.value.hasMore) hasMore = true;
      }
    });

    // 按更新时间排序并去重
    const uniqueItems = Array.from(
      new Map(allItems.map((item) => [item.id, item])).values(),
    );
    uniqueItems.sort(
      (a, b) =>
        new Date(b.update_time).getTime() - new Date(a.update_time).getTime(),
    );

    return {
      list: uniqueItems.slice(0, size),
      hasMore,
    };
  } catch (error) {
    console.error('获取短剧列表失败:', error);
    return { list: [], hasMore: false };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  resetDbQueryCount();

  try {
    const { searchParams } = request.nextUrl;
    const categoryId = searchParams.get('categoryId');
    const categoryName = searchParams.get('categoryName');
    const page = searchParams.get('page');
    const size = searchParams.get('size');

    // 详细日志记录

    if (!categoryId && !categoryName) {
      const errorResponse = {
        error: '缺少必要参数: categoryId 或 categoryName',
      };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/list',
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

    const category = categoryId ? parseInt(categoryId) : NaN;
    const pageNum = page ? parseInt(page) : 1;
    const pageSize = size ? parseInt(size) : 20;

    if (
      (!categoryName && (isNaN(category) || !categoryId)) ||
      isNaN(pageNum) ||
      isNaN(pageSize)
    ) {
      const errorResponse = { error: '参数格式错误' };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/list',
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

    const result = await getShortDramaListInternal(
      category,
      categoryName || undefined,
      pageNum,
      pageSize,
    );

    // 记录返回的数据

    // 设置与网页端一致的缓存策略
    const response = NextResponse.json(result);

    // 使用共享缓存时间配置
    const cacheTime = SHORTDRAMA_CACHE_SECONDS.lists;
    response.headers.set(
      'Cache-Control',
      `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    );
    response.headers.set('CDN-Cache-Control', `public, s-maxage=${cacheTime}`);
    response.headers.set(
      'Vercel-CDN-Cache-Control',
      `public, s-maxage=${cacheTime}`,
    );
    response.headers.set('X-Cache-Duration', `${cacheTime}s`);
    response.headers.set(
      'X-Cache-Expires-At',
      new Date(Date.now() + cacheTime * 1000).toISOString(),
    );
    response.headers.set('Vary', 'Accept-Encoding, User-Agent');

    // 记录性能指标
    const responseSize = Buffer.byteLength(JSON.stringify(result), 'utf8');
    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/list',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
      filter: `category:${categoryId}|page:${pageNum}|size:${pageSize}|count:${result.list?.length || 0}`,
    });

    return response;
  } catch (error) {
    console.error('获取短剧列表失败:', error);

    const errorResponse = { error: '服务器内部错误' };
    const responseSize = Buffer.byteLength(
      JSON.stringify(errorResponse),
      'utf8',
    );

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/list',
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
