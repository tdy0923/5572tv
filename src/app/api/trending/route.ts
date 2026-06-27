import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// 从采集源获取热门内容
export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    const sources = config.SourceConfig || [];

    // 获取前5个源的热门内容
    const enabledSources = sources.filter((s: any) => !s.disabled).slice(0, 5);
    const results: any[] = [];

    for (const source of enabledSources) {
      try {
        // 使用CMS代理获取视频列表
        const response = await fetch(`${source.api}?ac=list&pg=1`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.list && data.list.length > 0) {
            results.push({
              source: source.key,
              sourceName: source.name,
              items: data.list.slice(0, 10),
            });
          }
        }
      } catch (error) {
        // 忽略单个源的错误
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('获取热门内容失败:', error);
    return NextResponse.json({ error: '获取热门内容失败' }, { status: 500 });
  }
}
