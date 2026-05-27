/* eslint-disable no-console */
import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { fetchDoubanData } from '@/lib/douban';
import { getDoubanCookie } from '@/lib/douban-anti-crawler';
import { recordRequest } from '@/lib/performance-monitor';
import { DoubanItem, DoubanResult } from '@/lib/types';

interface DoubanCategoryApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  const { searchParams } = new URL(request.url);

  // 获取参数
  const kind = searchParams.get('kind') || 'movie';
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const pageLimit = parseInt(searchParams.get('limit') || '20');
  const pageStart = parseInt(searchParams.get('start') || '0');

  // 验证参数
  if (!kind || !category || !type) {
    const errorResponse = { error: '缺少必要参数: kind 或 category 或 type' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/categories',
      statusCode: 400,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 400 });
  }

  if (!['tv', 'movie'].includes(kind)) {
    const errorResponse = { error: 'kind 参数必须是 tv 或 movie' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/categories',
      statusCode: 400,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 400 });
  }

  if (pageLimit < 1 || pageLimit > 100) {
    const errorResponse = { error: 'pageSize 必须在 1-100 之间' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/categories',
      statusCode: 400,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 400 });
  }

  if (pageStart < 0) {
    const errorResponse = { error: 'pageStart 不能小于 0' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/categories',
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
    // 多个备用API端点
    const targets = [
      // 主用: 移动端API
      `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`,
      // 备用1: 桌面端搜索API
      `https://movie.douban.com/j/search_subjects?type=${kind === 'movie' ? 'movie' : 'tv'}&tag=${category === 'hot' ? '热门' : category === 'new' ? '最新' : category}&page_limit=${pageLimit}&page_start=${pageStart}`,
    ];

    // 获取反爬 cookie
    let doubanCookie = '';
    try {
      doubanCookie = await getDoubanCookie('https://movie.douban.com/');
    } catch {
      console.warn('[豆瓣分类] 获取反爬cookie失败');
    }

    let doubanData: DoubanCategoryApiResponse | null = null;
    let lastError: Error | null = null;

    // 依次尝试每个API端点
    for (const targetUrl of targets) {
      try {
        console.log(`[豆瓣分类] 尝试请求: ${targetUrl}`);
        const result = await fetchDoubanData<any>(targetUrl, doubanCookie);

        // 桌面端API返回格式不同，需要适配
        if (targetUrl.includes('j/search_subjects')) {
          if (
            result.subjects &&
            Array.isArray(result.subjects) &&
            result.subjects.length > 0
          ) {
            doubanData = {
              total: result.total || result.subjects.length,
              items: result.subjects.map((s: any) => ({
                id: String(s.id),
                title: s.title,
                card_subtitle: s.year
                  ? `${s.year} / ${s.genres?.join(' / ') || ''}`
                  : '',
                pic: {
                  large: s.cover || '',
                  normal: s.cover || '',
                },
                rating: {
                  value: parseFloat(s.rate) || 0,
                },
              })),
            };
            console.log(
              `[豆瓣分类] 备用API成功，获取 ${doubanData.items.length} 条数据`,
            );
            break;
          }
        } else {
          if (result.items && Array.isArray(result.items)) {
            doubanData = result as DoubanCategoryApiResponse;
            console.log(
              `[豆瓣分类] 主API成功，获取 ${doubanData.items.length} 条数据`,
            );
            break;
          }
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[豆瓣分类] 端点失败: ${targetUrl}`, lastError.message);
      }
    }

    if (!doubanData) {
      throw lastError || new Error('所有豆瓣API端点均失败');
    }

    console.log(
      `[豆瓣分类] 成功获取数据，项目数: ${doubanData.items?.length || 0}`,
    );

    // 转换数据格式
    const list: DoubanItem[] = doubanData.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    const response: DoubanResult = {
      code: 200,
      message: '获取成功',
      list: list,
    };

    const responseSize = Buffer.byteLength(JSON.stringify(response), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/categories',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize,
    });

    const cacheTime = await getCacheTime();
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    console.error(`[豆瓣分类] 所有API端点失败`, (error as Error).message);

    const errorResponse = {
      error: '获取豆瓣数据失败',
    };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/douban/categories',
      statusCode: 500,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: 0,
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
