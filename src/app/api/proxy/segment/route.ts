/* eslint-disable no-console */

import { NextResponse } from 'next/server';

import { fetchWithRetry, getSourceUserAgent } from '@/lib/proxy';
import { isUrlSafe } from '@/lib/ssrf-protection';

export const runtime = 'nodejs';

// 连接池管理
import * as http from 'http';
import * as https from 'https';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 30000,
  keepAliveMsecs: 30000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 30000,
  keepAliveMsecs: 30000,
});

// 性能统计
const segmentStats = {
  requests: 0,
  errors: 0,
  totalBytes: 0,
  avgResponseTime: 0,
  activeStreams: 0,
};

export async function GET(request: Request) {
  const startTime = Date.now();
  segmentStats.requests++;
  segmentStats.activeStreams++;

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const source =
    searchParams.get('5572tv-source') || searchParams.get('moontv-source');

  if (!url) {
    segmentStats.errors++;
    segmentStats.activeStreams--;
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // SSRF protection: block internal/private IPs
  const decodedUrl = decodeURIComponent(url);
  if (!isUrlSafe(decodedUrl)) {
    segmentStats.errors++;
    segmentStats.activeStreams--;
    return NextResponse.json({ error: '禁止访问内部地址' }, { status: 403 });
  }

  const ua = await getSourceUserAgent(source);

  let response: Response | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

  try {
    const isHttps = decodedUrl.startsWith('https:');
    const agent = isHttps ? httpsAgent : httpAgent;

    let refererOrigin = '';
    if (source && source.includes('.')) {
      refererOrigin = `https://${source}`;
    } else {
      try {
        const targetUrlObj = new URL(decodedUrl);
        refererOrigin = `${targetUrlObj.protocol}//${targetUrlObj.host}`;
      } catch {}
    }

    response = await fetchWithRetry(
      decodedUrl,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': ua,
          Accept: 'video/mp2t, video/*, */*',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          ...(refererOrigin ? { Referer: refererOrigin + '/' } : {}),
          ...(refererOrigin ? { Origin: refererOrigin } : {}),
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
        },

        agent: typeof window === 'undefined' ? agent : undefined,
      },
      ua,
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      segmentStats.errors++;
      return NextResponse.json(
        {
          error: `Failed to fetch segment: ${response.status} ${response.statusText}`,
        },
        { status: response.status >= 500 ? 500 : response.status },
      );
    }

    const headers = new Headers();

    // 设置内容类型 - 更精确的类型判断
    const originalContentType = response?.headers.get('Content-Type');
    if (originalContentType) {
      headers.set('Content-Type', originalContentType);
    } else {
      headers.set('Content-Type', 'video/mp2t');
    }

    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Range, Origin, Accept, User-Agent',
    );
    headers.set('Accept-Ranges', 'bytes');
    headers.set(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Range, Content-Type, Accept-Ranges',
    );
    headers.set('Cache-Control', 'public, max-age=300'); // 5分钟缓存

    // 复制原始响应的重要头部（不转发 Content-Length，因为流式传输使用 chunked encoding，两者冲突）
    const importantHeaders = ['Content-Range', 'Last-Modified', 'ETag'];
    importantHeaders.forEach((header) => {
      const value = response?.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    const _contentLength = parseInt(
      response?.headers.get('content-length') || '0',
      10,
    );
    let bytesTransferred = 0;

    // 优化的流式传输，带背压控制
    let streamCancelled = false;
    const stream = new ReadableStream(
      {
        start(controller) {
          if (!response?.body) {
            controller.close();
            segmentStats.activeStreams--;
            return;
          }

          reader = response?.body?.getReader();

          function pump(): void {
            if (streamCancelled || !reader) {
              return;
            }

            reader
              .read()
              .then(({ done, value }) => {
                if (streamCancelled) {
                  return;
                }

                if (done) {
                  controller.close();
                  cleanup();

                  // 更新统计信息
                  const responseTime = Date.now() - startTime;
                  segmentStats.avgResponseTime =
                    (segmentStats.avgResponseTime *
                      (segmentStats.requests - 1) +
                      responseTime) /
                    segmentStats.requests;
                  segmentStats.totalBytes += bytesTransferred;
                  segmentStats.activeStreams--;

                  return;
                }

                if (value) {
                  bytesTransferred += value.byteLength;
                }

                try {
                  controller.enqueue(value);
                } catch {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('Failed to enqueue chunk');
                  }
                  cleanup();
                  return;
                }

                pump();
              })
              .catch((error) => {
                if (!streamCancelled) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('Stream pump error:', error);
                  }
                  controller.error(error);
                  cleanup();
                }
              });
          }

          function cleanup() {
            if (reader) {
              try {
                reader.releaseLock();
              } catch {
                // reader 可能已经被释放，忽略错误
              }
              reader = null;
            }
            segmentStats.activeStreams--;
          }

          pump();
        },
        cancel() {
          streamCancelled = true;
          // 当流被取消时，确保释放所有资源
          if (reader) {
            try {
              reader.releaseLock();
            } catch {
              // reader 可能已经被释放，忽略错误
            }
            reader = null;
          }

          if (response?.body) {
            try {
              response.body.cancel();
            } catch {
              // 忽略取消时的错误
            }
          }

          segmentStats.activeStreams--;
        },
      },
      {
        // 添加背压控制
        highWaterMark: 65536, // 64KB 缓冲区
        size(chunk) {
          return chunk ? chunk.byteLength : 0;
        },
      },
    );

    return new Response(stream, { headers });
  } catch (error: any) {
    segmentStats.errors++;
    segmentStats.activeStreams--;
    clearTimeout(timeoutId);

    // 确保在错误情况下也释放资源
    if (reader) {
      try {
        (reader as ReadableStreamDefaultReader<Uint8Array>).releaseLock();
      } catch {
        // 忽略错误
      }
    }

    if (response?.body) {
      try {
        response.body.cancel();
      } catch {
        // 忽略错误
      }
    }

    // 处理不同类型的错误
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Segment request timeout' },
        { status: 408 },
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Network connection failed' },
        { status: 503 },
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Segment proxy error:', error);
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch segment',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeoutId);

    // 定期打印统计信息
    if (
      segmentStats.requests % 500 === 0 &&
      process.env.NODE_ENV === 'development'
    ) {
      console.log(
        `Segment Proxy Stats - Requests: ${segmentStats.requests}, Active: ${segmentStats.activeStreams}, Errors: ${segmentStats.errors}, Avg Time: ${segmentStats.avgResponseTime.toFixed(2)}ms, Total: ${(segmentStats.totalBytes / 1024 / 1024).toFixed(2)}MB`,
      );
    }
  }
}
