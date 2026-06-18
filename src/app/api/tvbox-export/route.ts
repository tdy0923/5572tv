/* eslint-disable no-console */

/**
 * TVBox Compatibility Export API
 * Exports site configuration in TVBox standard format
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') || 'json';

    const config = await getConfig();
    const baseUrl = request.nextUrl.origin;

    // Build TVBox config
    const tvboxConfig = {
      spider: '',
      wallpaper: `${baseUrl}/screenshot1.png`,
      sites: config.SourceConfig.filter((s: any) => !s.disabled).map(
        (s: any) => ({
          key: s.key,
          name: s.name,
          type: 0, // VOD source
          api: s.api,
          searchable: 1,
          quickSearch: 1,
          filterable: 1,
          ext: s.detail,
          timeout: 30,
          categories: ['电影', '电视剧', '综艺', '动漫', '纪录片', '短剧'],
        }),
      ),
      parses: [
        { name: 'Json并发', type: 2, url: 'Parallel' },
        { name: 'Json轮询', type: 2, url: 'Sequence' },
        { name: '内置解析', type: 1, url: `${baseUrl}/api/parse?url=` },
      ],
      flags: [
        'youku',
        'qq',
        'iqiyi',
        'qiyi',
        'letv',
        'sohu',
        'tudou',
        'pptv',
        'mgtv',
        'wasu',
        'bilibili',
        '优酷',
        '爱奇艺',
        '腾讯',
        '搜狐',
        '乐视',
        '芒果',
        '哔哩哔哩',
      ],
      lives: [
        {
          name: '直播',
          type: 0,
          url: `${baseUrl}/api/live/channels`,
        },
      ],
      ads: [
        'mimg.0c1q0l.cn',
        'www.googletagmanager.com',
        'static.criteo.net',
        'ad.doubleclick.net',
        'pagead2.googlesyndication.com',
      ],
    };

    if (format === 'base64') {
      const jsonStr = JSON.stringify(tvboxConfig);
      const base64 = Buffer.from(jsonStr).toString('base64');
      return new NextResponse(base64, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json(tvboxConfig, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TVBox export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
