/* eslint-disable no-console */
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
import { SHORT_DRAMA_SOURCES } from '@/lib/shortdrama-sources';
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

  const list = limitedItems.map(mapApiItemToShortDramaItem);

  return {
    list,
    hasMore: data.page < data.pagecount,
  };
}

// 服务端专用函数，从多个源聚合数据
async function getShortDramaListInternal(
  category: number,
  page = 1,
  size = 20,
) {
  try {
    // 找到包含此分类的所有源
    const sourcesWithCategory = SHORT_DRAMA_SOURCES.filter(
      (source) =>
        source.enabled && source.categories.some((c) => c.id === category),
    );

    // 如果没有找到匹配的源，使用所有启用的源
    const sourcesToQuery =
      sourcesWithCategory.length > 0
        ? sourcesWithCategory
        : SHORT_DRAMA_SOURCES.filter((s) => s.enabled);

    // 并行从所有源获取数据
    const results = await Promise.allSettled(
      sourcesToQuery.map((source) =>
        fetchListFromCategory(source.api, category, page, size),
      ),
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
    const page = searchParams.get('page');
    const size = searchParams.get('size');

    // 详细日志记录
    console.log('🚀 [SHORTDRAMA API] 收到请求:', {
      timestamp: new Date().toISOString(),
      categoryId,
      page,
      size,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      url: request.url,
    });

    if (!categoryId) {
      const errorResponse = { error: '缺少必要参数: categoryId' };
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

    const category = parseInt(categoryId);
    const pageNum = page ? parseInt(page) : 1;
    const pageSize = size ? parseInt(size) : 20;

    if (isNaN(category) || isNaN(pageNum) || isNaN(pageSize)) {
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

    const result = await getShortDramaListInternal(category, pageNum, pageSize);

    // 记录返回的数据
    console.log('✅ [SHORTDRAMA API] 返回数据:', {
      timestamp: new Date().toISOString(),
      count: result.list?.length || 0,
      firstItem: result.list?.[0]
        ? {
            id: result.list[0].id,
            name: result.list[0].name,
            update_time: result.list[0].update_time,
          }
        : null,
      hasMore: result.hasMore,
    });

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
