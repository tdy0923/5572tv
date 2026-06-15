import { NextRequest, NextResponse } from 'next/server';

import { getChapterPages } from '@/lib/manga';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  const source = searchParams.get('source');

  if (!url) {
    return NextResponse.json({ error: '缺少必要参数: url' }, { status: 400 });
  }

  if (!source) {
    return NextResponse.json(
      { error: '缺少必要参数: source' },
      { status: 400 },
    );
  }

  try {
    const chapterPages = await getChapterPages(url, source);

    if (!chapterPages) {
      return NextResponse.json({ error: '未找到章节内容' }, { status: 404 });
    }

    const response = NextResponse.json(chapterPages);
    const cacheTime = 3600;
    response.headers.set(
      'Cache-Control',
      `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    );
    response.headers.set('CDN-Cache-Control', `public, s-maxage=${cacheTime}`);

    return response;
  } catch (error) {
    console.error('获取章节页面失败:', error);
    return NextResponse.json({ error: '获取章节失败' }, { status: 500 });
  }
}
