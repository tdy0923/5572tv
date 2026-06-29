/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getCacheTime } from '@/lib/config';
import { db } from '@/lib/db';
import { getDetailFromApi, searchFromApi } from '@/lib/downstream';
import {
  getDbQueryCount,
  recordRequest,
  resetDbQueryCount,
} from '@/lib/performance-monitor';

export const runtime = 'nodejs';

const DETAIL_INTERNAL_CACHE_TTL = 120;

function getDetailCacheKey(
  username: string,
  sourceCode: string,
  id: string,
): string {
  return `detail:${username}:${sourceCode}:${id}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  resetDbQueryCount();

  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    const errorResponse = { error: 'Unauthorized' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/detail',
      statusCode: 401,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const sourceCode = searchParams.get('source');
  const title = searchParams.get('title') || '';

  if (!id || !sourceCode) {
    const errorResponse = { error: '缺少必要参数' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/detail',
      statusCode: 400,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 400 });
  }

  if (!/^[\w-]+$/.test(id)) {
    const errorResponse = { error: '无效的视频ID格式' };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/detail',
      statusCode: 400,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize: errorSize,
      filter: `id:${id}`,
    });

    return NextResponse.json(errorResponse, { status: 400 });
  }

  try {
    // 特殊处理 Emby 源
    if (sourceCode === 'emby' || sourceCode.startsWith('emby_')) {
      const { embyManager } = await import('@/lib/emby-manager');

      // 解析 embyKey
      let embyKey: string | undefined;
      if (sourceCode.startsWith('emby_')) {
        embyKey = sourceCode.substring(5); // 'emby_'.length = 5
      }

      // 获取客户端 - 使用用户配置
      const client = await embyManager.getClientForUser(
        authInfo.username,
        embyKey,
      );
      const sources = await embyManager.getEnabledSourcesForUser(
        authInfo.username,
      );
      const sourceConfig = sources.find((s) => s.key === embyKey);
      const sourceName = sourceConfig?.name || 'Emby';

      // 获取媒体详情
      const item = await client.getItem(id);

      // 获取音轨信息（不影响主流程）
      let audioStreams: any[] = [];
      try {
        audioStreams = await client.getAudioStreams(id);
      } catch (error) {
        // 音轨获取失败不影响播放
      }

      // 🎵 自动选择浏览器兼容的音轨（AAC 优先）
      const findCompatibleAudioTrack = (streams: any[]): number | undefined => {
        // 优先选择 AAC stereo
        const aacStereo = streams.find(
          (s) => s.codec === 'aac' && s.displayTitle?.includes('stereo'),
        );
        if (aacStereo) return aacStereo.index;

        // 其次选择任意 AAC
        const anyAac = streams.find((s) => s.codec === 'aac');
        if (anyAac) return anyAac.index;

        // 最后选择 MP3
        const mp3 = streams.find((s) => s.codec === 'mp3');
        if (mp3) return mp3.index;

        return undefined;
      };

      const compatibleAudioIndex = findCompatibleAudioTrack(audioStreams);
      console.log(
        '========== [/api/detail] 选择的兼容音轨索引:',
        compatibleAudioIndex,
      );

      let result: any;

      if (item.Type === 'Movie') {
        // 电影
        result = {
          source: sourceCode,
          source_name: sourceName,
          id: item.Id,
          title: item.Name,
          poster: client.getImageUrl(item.Id, 'Primary'),
          year: item.ProductionYear?.toString() || '',
          douban_id: 0,
          desc: item.Overview || '',
          episodes: [
            await client.getStreamUrl(
              item.Id,
              true,
              false,
              compatibleAudioIndex,
            ),
          ],
          episodes_titles: [item.Name],
          proxyMode: false,
          // 添加音轨信息
          private_audio_streams: audioStreams.map((stream) => ({
            index: stream.index,
            display_title: stream.displayTitle,
            language: stream.language,
            codec: stream.codec,
            is_default: stream.isDefault,
          })),
        };
      } else if (item.Type === 'Series') {
        // 剧集 - 获取所有季和集（分批并发获取各季）
        const seasons = await client.getSeasons(item.Id);
        const seasonEpisodes: any[][] = [];
        for (let i = 0; i < seasons.length; i += 3) {
          const batch = seasons.slice(i, i + 3);
          const batchResults = await Promise.all(
            batch.map((season: any) => client.getEpisodes(item.Id, season.Id)),
          );
          seasonEpisodes.push(...batchResults);
        }
        const allEpisodes = seasonEpisodes.flat();

        // 按季和集排序
        allEpisodes.sort((a, b) => {
          if (a.ParentIndexNumber !== b.ParentIndexNumber) {
            return (a.ParentIndexNumber || 0) - (b.ParentIndexNumber || 0);
          }
          return (a.IndexNumber || 0) - (b.IndexNumber || 0);
        });

        // 并发控制：每批3个请求，避免过多并发
        const CONCURRENCY = 3;
        const episodeUrls: string[] = [];
        for (let i = 0; i < allEpisodes.length; i += CONCURRENCY) {
          const batch = allEpisodes.slice(i, i + CONCURRENCY);
          const batchUrls = await Promise.all(
            batch.map(async (ep) => {
              try {
                const epAudioStreams = await client.getAudioStreams(ep.Id);
                const epCompatibleAudioIndex =
                  findCompatibleAudioTrack(epAudioStreams);
                return await client.getStreamUrl(
                  ep.Id,
                  true,
                  false,
                  epCompatibleAudioIndex,
                );
              } catch {
                return await client.getStreamUrl(ep.Id);
              }
            }),
          );
          episodeUrls.push(...batchUrls);
        }

        result = {
          source: sourceCode,
          source_name: sourceName,
          id: item.Id,
          title: item.Name,
          poster: client.getImageUrl(item.Id, 'Primary'),
          year: item.ProductionYear?.toString() || '',
          douban_id: 0,
          desc: item.Overview || '',
          episodes: episodeUrls,
          episodes_titles: allEpisodes.map((ep) => {
            const seasonNum = ep.ParentIndexNumber || 1;
            const episodeNum = ep.IndexNumber || 1;
            return `S${seasonNum.toString().padStart(2, '0')}E${episodeNum.toString().padStart(2, '0')}`;
          }),
          proxyMode: false,
          // 添加音轨信息（Series 级别的，仅供参考）
          private_audio_streams: audioStreams.map((stream) => ({
            index: stream.index,
            display_title: stream.displayTitle,
            language: stream.language,
            codec: stream.codec,
            is_default: stream.isDefault,
          })),
        };
      } else {
        throw new Error('不支持的媒体类型');
      }

      const responseSize = Buffer.byteLength(JSON.stringify(result), 'utf8');

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/detail',
        statusCode: 200,
        duration: Date.now() - startTime,
        memoryUsed:
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        dbQueries: getDbQueryCount(),
        requestSize: 0,
        responseSize,
        filter: `source:${sourceCode}|id:${id}`,
      });

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    // 处理普通 API 站点
    const apiSites = await getAvailableApiSites(authInfo.username);
    const apiSite = apiSites.find((site) => site.key === sourceCode);

    if (!apiSite) {
      const errorResponse = { error: '无效的API来源' };
      const errorSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/detail',
        statusCode: 400,
        duration: Date.now() - startTime,
        memoryUsed:
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        dbQueries: getDbQueryCount(),
        requestSize: 0,
        responseSize: errorSize,
        filter: `source:${sourceCode}`,
      });

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const detailCacheKey = getDetailCacheKey(authInfo.username, sourceCode, id);

    try {
      const cachedResult = await db.getCache(detailCacheKey);
      if (cachedResult) {
        const cacheTime = Math.min(
          await getCacheTime(),
          DETAIL_INTERNAL_CACHE_TTL,
        );
        const responseSize = Buffer.byteLength(
          JSON.stringify(cachedResult),
          'utf8',
        );

        recordRequest({
          timestamp: startTime,
          method: 'GET',
          path: '/api/detail',
          statusCode: 200,
          duration: Date.now() - startTime,
          memoryUsed:
            (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
          dbQueries: getDbQueryCount(),
          requestSize: 0,
          responseSize,
          filter: `source:${sourceCode}|id:${id}|cache:hit`,
        });

        return NextResponse.json(cachedResult, {
          headers: {
            'Cache-Control': `private, max-age=${cacheTime}, stale-while-revalidate=30`,
            Vary: 'Cookie',
          },
        });
      }
    } catch {
      // 缓存读取失败时回退到实时详情，不影响主流程
    }

    // 优先通过搜索匹配（如果有 title）
    let result: any = null;

    if (title.trim()) {
      try {
        const searchResults = await searchFromApi(apiSite, title.trim());
        result =
          searchResults.find(
            (item: any) =>
              item.source?.toString() === sourceCode.toString() &&
              item.id?.toString() === id.toString(),
          ) || null;
      } catch {
        // 搜索失败，继续尝试直接获取详情
      }
    }

    // Fallback: 直接通过 ID 获取详情
    if (!result) {
      try {
        result = await getDetailFromApi(apiSite, id);
      } catch {
        // 直接获取也失败
      }
    }

    if (!result) {
      const errorResponse = { error: '未找到匹配的视频源' };
      const errorSize = Buffer.byteLength(
        JSON.stringify(errorResponse),
        'utf8',
      );

      recordRequest({
        timestamp: startTime,
        method: 'GET',
        path: '/api/detail',
        statusCode: 404,
        duration: Date.now() - startTime,
        memoryUsed:
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        dbQueries: getDbQueryCount(),
        requestSize: 0,
        responseSize: errorSize,
        filter: `source:${sourceCode}|id:${id}`,
      });

      return NextResponse.json(errorResponse, { status: 404 });
    }

    const cacheTime = await getCacheTime();
    const detailResponseCacheTime = Math.min(
      cacheTime,
      DETAIL_INTERNAL_CACHE_TTL,
    );

    const responseSize = Buffer.byteLength(JSON.stringify(result), 'utf8');

    try {
      await db.setCache(detailCacheKey, result, DETAIL_INTERNAL_CACHE_TTL);
    } catch {
      // 缓存写入失败时保持正常返回
    }

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/detail',
      statusCode: 200,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize,
      filter: `source:${sourceCode}|id:${id}`,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `private, max-age=${detailResponseCacheTime}, stale-while-revalidate=30`,
        Vary: 'Cookie',
      },
    });
  } catch (error) {
    const errorResponse = { error: (error as Error).message };
    const errorSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

    recordRequest({
      timestamp: startTime,
      method: 'GET',
      path: '/api/detail',
      statusCode: 500,
      duration: Date.now() - startTime,
      memoryUsed: (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      dbQueries: getDbQueryCount(),
      requestSize: 0,
      responseSize: errorSize,
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
