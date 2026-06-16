/* eslint-disable no-console */
import { NextRequest } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

interface ValidationResult {
  key: string;
  name: string;
  status: 'valid' | 'no_results' | 'invalid' | 'error';
  itemCount: number;
  responseTime: number;
  error?: string;
}

async function validateSource(
  key: string,
  name: string,
  api: string,
  keyword: string,
  timeout: number,
): Promise<ValidationResult> {
  const startTime = Date.now();
  try {
    const searchUrl = `${api}?ac=detail&wd=${encodeURIComponent(keyword)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
    });
    clearTimeout(timer);

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        key,
        name,
        status: 'invalid',
        itemCount: 0,
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const items = data.list || [];
    const matchingItems = items.filter(
      (item: any) => item.vod_name && item.vod_name.includes(keyword),
    );

    return {
      key,
      name,
      status: matchingItems.length > 0 ? 'valid' : 'no_results',
      itemCount: matchingItems.length,
      responseTime,
    };
  } catch (e: any) {
    return {
      key,
      name,
      status: 'error',
      itemCount: 0,
      responseTime: Date.now() - startTime,
      error: e.message || 'Unknown error',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const keyword = searchParams.get('keyword') || '速度与激情';
    const timeout = parseInt(searchParams.get('timeout') || '10', 10);
    const concurrency = parseInt(searchParams.get('concurrency') || '10', 10);

    const config = await getConfig();
    const sources = config.SourceConfig.filter((s) => !s.disabled);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send start event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'start', totalSources: sources.length, keyword })}\n\n`,
          ),
        );

        let completedSources = 0;
        const batchSize = concurrency;

        for (let i = 0; i < sources.length; i += batchSize) {
          const batch = sources.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map((s) =>
              validateSource(s.key, s.name, s.api, keyword, timeout),
            ),
          );

          for (const result of results) {
            if (result.status === 'fulfilled') {
              const validation = result.value;
              completedSources++;

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'source_result',
                    ...validation,
                    completed: completedSources,
                    total: sources.length,
                  })}\n\n`,
                ),
              );
            } else {
              completedSources++;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'source_error',
                    key: 'unknown',
                    name: 'unknown',
                    status: 'error',
                    error: result.reason?.message || 'Unknown error',
                    completed: completedSources,
                    total: sources.length,
                  })}\n\n`,
                ),
              );
            }
          }
        }

        // Send complete event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'complete', total: sources.length })}\n\n`,
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
      },
    });
  } catch (error) {
    console.error('源验证失败:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
