import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    const config = await getConfig();
    const sources = config.SourceConfig || [];

    // 获取前5个源的热门内容
    const enabledSources = sources.filter((s: any) => !s.disabled).slice(0, 5);
    const results: any[] = [];

    for (const source of enabledSources) {
      try {
        // ac=detail 返回完整信息含海报URL
        const response = await fetch(`${source.api}?ac=detail&pg=1`, {
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
