import { NextRequest, NextResponse } from 'next/server';

import { searchManga } from '@/lib/manga';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');
  const page = searchParams.get('page');

  if (!query) {
    return NextResponse.json(
      { error: '缺少搜索关键词参数: q' },
      { status: 400 },
    );
  }

  const pageNum = page ? parseInt(page) : 1;

  if (isNaN(pageNum) || pageNum < 1) {
    return NextResponse.json({ error: '页码参数格式错误' }, { status: 400 });
  }

  try {
    const result = await searchManga(query, pageNum);

    const response = NextResponse.json(result);
    const cacheTime = 1800;
    response.headers.set(
      'Cache-Control',
      `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    );
    response.headers.set('CDN-Cache-Control', `public, s-maxage=${cacheTime}`);

    return response;
  } catch {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
