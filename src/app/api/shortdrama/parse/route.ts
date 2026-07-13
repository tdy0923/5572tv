/* eslint-disable no-console, unused-imports/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';

import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';
import {
  applyShortDramaCacheHeaders,
  DEFAULT_SHORT_DRAMA_API,
  SHORTDRAMA_CACHE_SECONDS,
} from '@/lib/shortdrama-constants';
import { getEnabledSources } from '@/lib/shortdrama-sources';

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

    // Build all source APIs to try (primary + enabled multi-sources)
    const enabledSources = getEnabledSources();
    const allApis = [DEFAULT_SHORT_DRAMA_API];
    for (const source of enabledSources) {
      if (source.api !== DEFAULT_SHORT_DRAMA_API) {
        allApis.push(source.api);
      }
    }

    const params = new URLSearchParams({
      ac: 'detail',
      ids: videoId.toString(),
    });

    let data: any = null;
    let lastError: string = '';

    // Try all sources in parallel, use first successful result
    const results = await Promise.allSettled(
      allApis.map(async (api) => {
        const response = await fetch(`${api}?${params.toString()}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!json.list || json.list.length === 0) throw new Error('empty');
        return json;
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        data = result.value;
        break;
      }
      lastError = result.reason?.message || 'unknown';
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
    // 解析播放地址：格式为 "第1集$url1#第2集$url2$$$第1集$m3u8url1#第2集$m3u8url2"
    // 先按 $$$ 分割不同播放源，再按 # 分割集数，再按 $ 分割名称和URL
    const formatGroups = playUrl.split('$$$').filter(Boolean);
    let bestEpisodes: { name: string; url: string }[] = [];

    for (const group of formatGroups) {
      const eps = group
        .split('#')
        .map((ep: string) => {
          const parts = ep.split('$');
          return { name: parts[0] || '', url: parts[1] || '' };
        })
        .filter((ep) => ep.url);

      if (eps.length === 0) continue;

      // Prefer hnm3u8 format (HLS streams) over hnyun (HTML player pages)
      const hasM3u8 = eps.some((ep) => ep.url.includes('.m3u8'));
      if (hasM3u8 || bestEpisodes.length === 0) {
        bestEpisodes = eps;
      }
    }

    const episodeIndex = Math.max(0, episodeNum - 1);
    const currentEpisode = bestEpisodes[episodeIndex] ||
      bestEpisodes[0] || { url: '' };

    const result = {
      code: 0,
      data: {
        videoId: videoId,
        videoName: drama.vod_name || '',
        currentEpisode: episodeNum,
        totalEpisodes: bestEpisodes.length || 1,
        parsedUrl: currentEpisode.url || '',
        proxyUrl: currentEpisode.url
          ? `/api/proxy/shortdrama?url=${encodeURIComponent(currentEpisode.url)}`
          : '',
        cover: drama.vod_pic || '',
        description: drama.vod_content || drama.vod_blurb || '',
        episode: { index: episodeNum, url: currentEpisode.url },
      },
    };

    // 返回视频URL，优先使用原始URL让客户端直接获取（绕过CDN防盗链）
    const episodeData = result.data?.episode;
    const parsedUrl = episodeData?.url || result.data!.parsedUrl || '';
    const proxyUrl = result.data!.proxyUrl || '';

    const apiResponse = {
      url: parsedUrl || proxyUrl, // 优先使用原始URL
      originalUrl: parsedUrl,
      proxyUrl: proxyUrl,
      title: result.data!.videoName || '',
      episode: result.data!.currentEpisode || episodeNum,
      totalEpisodes: result.data!.totalEpisodes || 1,
    };

    // 设置缓存策略
    const finalResponse = NextResponse.json(apiResponse);
    applyShortDramaCacheHeaders(finalResponse, SHORTDRAMA_CACHE_SECONDS.parse);
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
