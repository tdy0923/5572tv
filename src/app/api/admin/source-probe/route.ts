/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

interface ProbeResult {
  key: string;
  name: string;
  status: 'ok' | 'slow' | 'fail';
  responseTime: number;
  httpCode: number;
  itemCount: number;
  error?: string;
}

async function probeSource(
  key: string,
  name: string,
  api: string,
  timeout: number,
): Promise<ProbeResult> {
  const startTime = Date.now();
  try {
    const testUrl = `${api}?ac=list&pg=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(testUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
    });
    clearTimeout(timer);

    const responseTime = Date.now() - startTime;
    const httpCode = response.status;

    if (!response.ok) {
      return {
        key,
        name,
        status: 'fail',
        responseTime,
        httpCode,
        itemCount: 0,
        error: `HTTP ${httpCode}`,
      };
    }

    const data = await response.json();
    const itemCount = data.list?.length || data.total || 0;

    return {
      key,
      name,
      status: responseTime < 5000 ? 'ok' : 'slow',
      responseTime,
      httpCode,
      itemCount,
    };
  } catch (e: any) {
    return {
      key,
      name,
      status: 'fail',
      responseTime: Date.now() - startTime,
      httpCode: 0,
      itemCount: 0,
      error: e.message || 'Unknown error',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const timeout = parseInt(searchParams.get('timeout') || '8', 10);
    const concurrency = parseInt(searchParams.get('concurrency') || '10', 10);

    const config = await getConfig();
    const sources = config.SourceConfig.filter((s) => !s.disabled);

    const results: ProbeResult[] = [];
    const batchSize = concurrency;

    for (let i = 0; i < sources.length; i += batchSize) {
      const batch = sources.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((s) => probeSource(s.key, s.name, s.api, timeout)),
      );
      results.push(...batchResults);
    }

    const okCount = results.filter((r) => r.status === 'ok').length;
    const slowCount = results.filter((r) => r.status === 'slow').length;
    const failCount = results.filter((r) => r.status === 'fail').length;

    // Sort by response time (fastest first)
    results.sort((a, b) => a.responseTime - b.responseTime);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      total: results.length,
      okCount,
      slowCount,
      failCount,
      avgResponseTime:
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
      results,
    });
  } catch (error) {
    console.error('源探测失败:', error);
    return NextResponse.json(
      { error: '探测失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}
