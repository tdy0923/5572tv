/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime, getConfig } from '@/lib/config';
import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  resetDbQueryCount();

  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    const episode = searchParams.get('episode');
    const name = searchParams.get('name'); // 可选：用于备用API

    if (!id) {
      const errorResponse = { error: '缺少必要参数: id' };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/detail',
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

    const videoId = parseInt(id);
    const episodeNum = episode ? parseInt(episode) : 1;

    if (isNaN(videoId) || isNaN(episodeNum)) {
      const errorResponse = { error: '参数格式错误' };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/detail',
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

    // 直接从主API获取数据（避免链式调用parse导致Cloudflare超时）
    let primaryApi = 'https://tyyszy.com/api.php/provide/vod';
    let alternativeApiUrl: string | undefined;
    try {
      const config = await getConfig();
      const shortDramaConfig = config.ShortDramaConfig;
      if (shortDramaConfig?.primaryApiUrl) {
        primaryApi = shortDramaConfig.primaryApiUrl;
      }
      alternativeApiUrl = shortDramaConfig?.enableAlternative
        ? shortDramaConfig.alternativeApiUrl
        : undefined;
    } catch (configError) {
      console.error('读取短剧配置失败:', configError);
    }

    const params = new URLSearchParams({
      ac: 'detail',
      ids: videoId.toString(),
    });

    let data: any = null;
    let lastError: string = '';

    // 尝试主API
    try {
      const response = await fetch(`${primaryApi}?${params.toString()}`, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) {
        data = await response.json();
      } else {
        lastError = `主API HTTP ${response.status}`;
      }
    } catch (e) {
      lastError = `主API请求失败: ${e}`;
    }

    // 主API失败时，尝试备用API
    if ((!data || !data.list || data.list.length === 0) && alternativeApiUrl) {
      try {
        const altResponse = await fetch(
          `${alternativeApiUrl}/api.php/provide/vod?${params.toString()}`,
          {
            headers: {
              'User-Agent': DEFAULT_USER_AGENT,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(12000),
          },
        );
        if (altResponse.ok) {
          data = await altResponse.json();
        }
      } catch (e) {
        console.error('备用API也失败:', e);
      }
    }

    if (!data || !data.list || data.list.length === 0) {
      return NextResponse.json(
        { error: lastError || '短剧API请求失败' },
        { status: 502 },
      );
    }

    const drama = data.list[0];
    const playUrl = drama.vod_play_url || '';
    // 解析播放地址：格式为 "01$url1#02$url2"
    const episodes = playUrl.split('#').map((ep: string) => {
      const parts = ep.split('$');
      return { name: parts[0], url: parts[1] || '' };
    });

    const totalEpisodes = Math.max(episodes.length || 1, 1);

    // 直接提取所有集数的视频URL，通过代理避免CORS问题
    const episodeUrls: string[] = episodes.map((ep: any) => {
      if (ep.url) {
        return `/api/proxy/shortdrama?url=${encodeURIComponent(ep.url)}`;
      }
      return '';
    });

    // 转换为兼容格式
    // 注意：始终使用请求的原始ID（主API的ID），不使用result.data.videoId（可能是备用API的ID）
    const response: any = {
      id: id, // 使用原始请求ID，保持一致性
      title: drama.vod_name || '',
      poster: drama.vod_pic || '',
      episodes:
        episodeUrls.length > 0
          ? episodeUrls
          : Array.from(
              { length: totalEpisodes },
              (_, i) => `shortdrama:${id}:${i}`,
            ),
      episodes_titles: Array.from(
        { length: totalEpisodes },
        (_, i) => `第${i + 1}集`,
      ),
      source: 'shortdrama',
      source_name: '短剧',
      year: new Date().getFullYear().toString(),
      desc: drama.vod_content || drama.vod_blurb || '',
      type_name: '短剧',
      drama_name: drama.vod_name || '',
    };

    // 设置与豆瓣一致的缓存策略
    const cacheTime = await getCacheTime();
    const finalResponse = NextResponse.json(response);
    finalResponse.headers.set(
      'Cache-Control',
      `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    );
    finalResponse.headers.set(
      'CDN-Cache-Control',
      `public, s-maxage=${cacheTime}`,
    );
    finalResponse.headers.set(
      'Vercel-CDN-Cache-Control',
      `public, s-maxage=${cacheTime}`,
    );
    finalResponse.headers.set('Netlify-Vary', 'query');

    // 记录性能指标
    const responseSize = Buffer.byteLength(JSON.stringify(response), 'utf8');
    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/detail',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
    });

    return finalResponse;
  } catch (error) {
    console.error('短剧详情获取失败:', error);

    const errorResponse = { error: '服务器内部错误' };
    const responseSize = Buffer.byteLength(
      JSON.stringify(errorResponse),
      'utf8',
    );

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/detail',
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
