/* eslint-disable no-console, unused-imports/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime, getConfig } from '@/lib/config';
import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';

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

    if (!id || !episode) {
      const errorResponse = { error: '缺少必要参数: id, episode' };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/parse',
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
    const episodeNum = parseInt(episode);

    if (isNaN(videoId) || isNaN(episodeNum)) {
      const errorResponse = { error: '参数格式错误' };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/parse',
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

    // 读取配置以获取主API和备用API地址
    let primaryApi = 'https://wwzy.tv/api.php/provide/vod';
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
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
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
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (altResponse.ok) {
          data = await altResponse.json();
        }
      } catch (e) {
        console.error('备用API也失败:', e);
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: lastError || '短剧API请求失败' },
        { status: 502 },
      );
    }

    if (!data.list || data.list.length === 0) {
      return NextResponse.json({ error: '未找到短剧数据' }, { status: 404 });
    }

    const drama = data.list[0];
    const playUrl = drama.vod_play_url || '';
    // 解析播放地址：格式为 "01$url1#02$url2"
    const episodes = playUrl.split('#').map((ep: string) => {
      const parts = ep.split('$');
      return { name: parts[0], url: parts[1] || '' };
    });

    const episodeIndex = Math.max(0, episodeNum - 1);
    const currentEpisode = episodes[episodeIndex] || episodes[0] || { url: '' };

    const result = {
      code: 0,
      data: {
        videoId: videoId,
        videoName: drama.vod_name || '',
        currentEpisode: episodeNum,
        totalEpisodes: episodes.length || 1,
        parsedUrl: currentEpisode.url || '',
        proxyUrl: '',
        cover: drama.vod_pic || '',
        description: drama.vod_content || drama.vod_blurb || '',
        episode: { index: episodeNum, url: currentEpisode.url },
      },
    };

    if (result.code !== 0) {
      const errorResponse = { error: '解析失败' };
      const responseSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/shortdrama/parse',
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

    // 返回视频URL，优先使用代理URL避免CORS问题
    const episodeData = result.data?.episode;
    const parsedUrl = episodeData?.url || result.data!.parsedUrl || '';
    const proxyUrl = result.data!.proxyUrl || '';

    const apiResponse = {
      url: proxyUrl || parsedUrl, // 优先使用代理URL
      originalUrl: parsedUrl,
      proxyUrl: proxyUrl,
      title: result.data!.videoName || '',
      episode: result.data!.currentEpisode || episodeNum,
      totalEpisodes: result.data!.totalEpisodes || 1,
    };

    // 设置与豆瓣一致的缓存策略
    const cacheTime = await getCacheTime();
    const finalResponse = NextResponse.json(apiResponse);
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
    const responseSize = Buffer.byteLength(JSON.stringify(apiResponse), 'utf8');
    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/parse',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
    });

    return finalResponse;
  } catch (error) {
    console.error('短剧解析失败:', error);

    const errorResponse = { error: '服务器内部错误' };
    const responseSize = Buffer.byteLength(
      JSON.stringify(errorResponse),
      'utf8',
    );

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/shortdrama/parse',
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
