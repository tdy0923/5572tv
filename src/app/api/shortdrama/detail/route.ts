/* eslint-disable no-console */
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
    const sourceApi = searchParams.get('source'); // 可选：指定来源API

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

    // If a specific source API was provided, only query that one
    // Otherwise try all enabled sources
    const apisToTry: string[] = [];
    if (sourceApi) {
      apisToTry.push(sourceApi);
    } else {
      const enabledSources = getEnabledSources();
      apisToTry.push(DEFAULT_SHORT_DRAMA_API);
      for (const source of enabledSources) {
        if (source.api !== DEFAULT_SHORT_DRAMA_API) {
          apisToTry.push(source.api);
        }
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
      apisToTry.map(async (api) => {
        const response = await fetch(`${api}?${params.toString()}`, {
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(12000),
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

    if (!data || !data.list || data.list.length === 0) {
      return NextResponse.json(
        { error: lastError || '短剧API请求失败' },
        { status: 502 },
      );
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

    const totalEpisodes = Math.max(bestEpisodes.length || 1, 1);

    // 直接提取所有集数的视频URL
    const episodeUrls: string[] = bestEpisodes.map((ep) => ep.url);

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

    // 设置缓存策略
    const finalResponse = NextResponse.json(response);
    applyShortDramaCacheHeaders(finalResponse, SHORTDRAMA_CACHE_SECONDS.detail);
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
