/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 短剧相关的分类关键词
const SHORT_DRAMA_KEYWORDS = [
  '短剧',
  '女频恋爱',
  '反转爽剧',
  '古装仙侠',
  '年代穿越',
  '脑洞悬疑',
  '现代都市',
  '短篇',
  '短集',
];

// 从单个短剧源获取数据（通过分类名称查找）
async function fetchListFromSource(api: string, page: number, size: number) {
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
    return { list: [], hasMore: false };
  }

  console.log(
    `找到 ${shortDramaCategories.length} 个短剧分类:`,
    shortDramaCategories
      .map((c: any) => `${c.type_name}(${c.type_id})`)
      .join(', '),
  );

  // Step 2: 从所有短剧分类获取数据（取第一个有数据的分类）
  for (const cat of shortDramaCategories) {
    const apiUrl = `${api}?ac=detail&t=${cat.type_id}&pg=${page}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) continue;

    const data = await response.json();
    const items = data.list || [];

    if (items.length === 0) continue;

    const limitedItems = items.slice(0, size);

    const list = limitedItems.map((item: any) => ({
      id: item.vod_id,
      name: item.vod_name,
      cover: item.vod_pic || '',
      update_time: item.vod_time || new Date().toISOString(),
      score: parseFloat(item.vod_score) || 0,
      episode_count: parseInt(item.vod_remarks?.replace(/[^\d]/g, '') || '1'),
      description: item.vod_content || item.vod_blurb || '',
      author: item.vod_actor || '',
      backdrop: item.vod_pic_slide || item.vod_pic || '',
      vote_average: parseFloat(item.vod_score) || 0,
      vod_area: item.vod_area || '',
      vod_year: item.vod_year || '',
      vod_time: item.vod_time ? new Date(item.vod_time).getTime() / 1000 : 0,
      vod_hits: parseInt(item.vod_hits || '0'),
      vod_name: item.vod_name || '',
    }));

    return {
      list,
      hasMore: data.page < data.pagecount,
    };
  }

  return { list: [], hasMore: false };
}

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

  const list = limitedItems.map((item: any) => ({
    id: item.vod_id,
    name: item.vod_name,
    cover: item.vod_pic || '',
    update_time: item.vod_time || new Date().toISOString(),
    score: parseFloat(item.vod_score) || 0,
    episode_count: parseInt(item.vod_remarks?.replace(/[^\d]/g, '') || '1'),
    description: item.vod_content || item.vod_blurb || '',
    author: item.vod_actor || '',
    backdrop: item.vod_pic_slide || item.vod_pic || '',
    vote_average: parseFloat(item.vod_score) || 0,
    vod_area: item.vod_area || '',
    vod_year: item.vod_year || '',
    vod_time: item.vod_time ? new Date(item.vod_time).getTime() / 1000 : 0,
    vod_hits: parseInt(item.vod_hits || '0'),
    vod_name: item.vod_name || '',
  }));

  return {
    list,
    hasMore: data.page < data.pagecount,
  };
}

// 服务端专用函数，从所有短剧源聚合数据
async function getShortDramaListInternal(
  category: number,
  page = 1,
  size = 20,
) {
  try {
    // 只使用tyyszy.com作为默认源（确保ID与parse API兼容）
    return await fetchListFromCategory(
      'https://tyyszy.com/api.php/provide/vod',
      category,
      page,
      size,
    );
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

    // 设置与网页端一致的缓存策略（lists: 2小时）
    const response = NextResponse.json(result);

    console.log('🕐 [LIST] 设置2小时HTTP缓存 - 与网页端lists缓存一致');

    // 2小时 = 7200秒（与网页端SHORTDRAMA_CACHE_EXPIRE.lists一致）
    const cacheTime = 7200;
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
    response.headers.set('X-Cache-Duration', '2hour');
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
