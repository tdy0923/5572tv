/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getConfig } from '@/lib/config';
import { getCacheTime } from '@/lib/config';
import { db } from '@/lib/db';
import { searchFromApi } from '@/lib/downstream';
import { generateSearchVariants } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';

function getSearchCacheKey(username: string, query: string) {
  return `search:${username}:${query.trim().toLowerCase()}`;
}

export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 搜索限流：每IP每分钟最多10次
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const rateLimitKey = `search_ratelimit:${ip}`;
  const rateLimitCount = await db.getCache(rateLimitKey);
  if (rateLimitCount && (rateLimitCount as number) >= 10) {
    return NextResponse.json(
      { error: '搜索过于频繁，请稍后再试' },
      { status: 429 },
    );
  }
  await db.setCache(rateLimitKey, ((rateLimitCount as number) || 0) + 1, 60);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: '搜索关键词不能为空' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);
  const searchVariants = generateSearchVariants(query);
  const searchCacheKey = getSearchCacheKey(authInfo.username, query);
  const cacheTime = Math.max(15, Math.min(await getCacheTime(), 120));

  try {
    const cachedResults = await db.getCache(searchCacheKey);
    if (Array.isArray(cachedResults) && cachedResults.length > 0) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                query,
                totalSources: 1,
                timestamp: Date.now(),
                cached: true,
              })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'source_result',
                source: 'cache',
                sourceName: '缓存结果',
                results: cachedResults,
                timestamp: Date.now(),
                cached: true,
              })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                totalResults: cachedResults.length,
                completedSources: 1,
                timestamp: Date.now(),
                cached: true,
              })}\n\n`,
            ),
          );
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
  } catch (error) {
    console.warn('读取流式搜索缓存失败:', error);
  }

  // 共享状态
  let streamClosed = false;

  // 创建可读流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 辅助函数：安全地向控制器写入数据
      const safeEnqueue = (data: Uint8Array) => {
        try {
          if (
            streamClosed ||
            (!controller.desiredSize && controller.desiredSize !== 0)
          ) {
            // 流已标记为关闭或控制器已关闭
            return false;
          }
          controller.enqueue(data);
          return true;
        } catch (error) {
          // 控制器已关闭或出现其他错误
          console.warn('Failed to enqueue data:', error);
          streamClosed = true;
          return false;
        }
      };

      // 发送开始事件
      const startEvent = `data: ${JSON.stringify({
        type: 'start',
        query,
        totalSources: apiSites.length,
        timestamp: Date.now(),
      })}\n\n`;

      if (!safeEnqueue(encoder.encode(startEvent))) {
        return; // 连接已关闭，提前退出
      }

      // 记录已完成的源数量
      let completedSources = 0;
      const allResults: any[] = [];
      const seenSSE = new Set<string>();

      // 为每个源创建搜索 Promise
      const searchPromises = apiSites.map(async (site) => {
        try {
          // 添加超时控制
          const searchPromise = Promise.race([
            searchFromApi(site, query, searchVariants),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error(`${site.name} timeout`)),
                20000,
              ),
            ),
          ]);

          const results = (await searchPromise) as any[];

          // 过滤黄色内容
          let filteredResults = results;
          if (!config.SiteConfig.DisableYellowFilter) {
            filteredResults = results.filter((result) => {
              const typeName = result.type_name || '';
              const sourceName = result.source_name || '';
              const isAdult = yellowWords.some(
                (word: string) =>
                  typeName.includes(word) || sourceName.includes(word),
              );
              const hasAdultEmoji = sourceName.includes('🔞');
              return !isAdult && !hasAdultEmoji;
            });
          }

          // 去重：同一 source+id 只保留第一个
          filteredResults = filteredResults.filter((result) => {
            const key = `${result.source}:${result.id}`;
            if (seenSSE.has(key)) return false;
            seenSSE.add(key);
            return true;
          });

          // 发送该源的搜索结果
          completedSources++;

          if (!streamClosed) {
            const sourceEvent = `data: ${JSON.stringify({
              type: 'source_result',
              source: site.key,
              sourceName: site.name,
              results: filteredResults,
              timestamp: Date.now(),
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(sourceEvent))) {
              streamClosed = true;
              return; // 连接已关闭，停止处理
            }
          }

          if (filteredResults.length > 0) {
            for (const r of filteredResults) {
              const key = `${r.source}:${r.id}`;
              if (!seenSSE.has(key)) {
                seenSSE.add(key);
                allResults.push(r);
              }
            }
          }
        } catch (error) {
          console.warn(`搜索失败 ${site.name}:`, error);

          // 发送源错误事件
          completedSources++;

          if (!streamClosed) {
            const errorEvent = `data: ${JSON.stringify({
              type: 'source_error',
              source: site.key,
              sourceName: site.name,
              error: error instanceof Error ? error.message : '搜索失败',
              timestamp: Date.now(),
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(errorEvent))) {
              streamClosed = true;
              return; // 连接已关闭，停止处理
            }
          }
        }

        // 检查是否所有源都已完成
        if (completedSources === apiSites.length) {
          if (allResults.length > 0) {
            try {
              await db.setCache(searchCacheKey, allResults, cacheTime);
            } catch (error) {
              console.warn('写入流式搜索缓存失败:', error);
            }
          }

          if (!streamClosed) {
            // 发送最终完成事件
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete',
              totalResults: allResults.length,
              completedSources,
              timestamp: Date.now(),
            })}\n\n`;

            if (safeEnqueue(encoder.encode(completeEvent))) {
              // 只有在成功发送完成事件后才关闭流
              try {
                controller.close();
              } catch (error) {
                console.warn('Failed to close controller:', error);
              }
            }
          }
        }
      });

      // 等待所有搜索完成
      await Promise.allSettled(searchPromises);
    },

    cancel() {
      // 客户端断开连接时，标记流已关闭
      streamClosed = true;
      console.log('Client disconnected, cancelling search stream');
    },
  });

  // 返回流式响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
