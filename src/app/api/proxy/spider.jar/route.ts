/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getSpiderJar } from '@/lib/spiderJar';
import { isUrlSafe } from '@/lib/ssrf-protection';

export const runtime = 'nodejs';

// Spider JAR 本地代理端点 - 使用统一的 jar 获取逻辑
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customUrl = searchParams.get('url');
    const forceRefresh = searchParams.get('refresh') === '1';

    // SSRF protection: block internal/private IPs if custom URL provided
    if (customUrl && !isUrlSafe(customUrl)) {
      return NextResponse.json({ error: '禁止访问内部地址' }, { status: 403 });
    }

    const jarInfo = await getSpiderJar(forceRefresh, customUrl || undefined);

    console.log(
      `[Spider Proxy] 提供 ${jarInfo.success ? '真实' : '降级'} jar: ${jarInfo.source}, 大小: ${jarInfo.size} bytes, 缓存: ${jarInfo.cached}`,
    );

    return new NextResponse(new Uint8Array(jarInfo.buffer), {
      headers: {
        'Content-Type': 'application/java-archive',
        'Content-Length': jarInfo.size.toString(),
        'Cache-Control': 'public, max-age=14400, s-maxage=14400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Spider-Source': jarInfo.source,
        'X-Spider-Success': jarInfo.success.toString(),
        'X-Spider-Cached': jarInfo.cached.toString(),
      },
    });
  } catch (error) {
    console.error('[Spider Proxy] 代理错误:', error);
    return NextResponse.json(
      {
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
