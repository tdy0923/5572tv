import { NextRequest, NextResponse } from 'next/server';

import { getMangaDetail } from '@/lib/manga';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const source = searchParams.get('source');

  if (!id) {
    return NextResponse.json({ error: '缺少必要参数: id' }, { status: 400 });
  }

  if (!source) {
    return NextResponse.json(
      { error: '缺少必要参数: source' },
      { status: 400 },
    );
  }

  try {
    const detail = await getMangaDetail(id, source);

    if (!detail) {
      return NextResponse.json({ error: '未找到漫画详情' }, { status: 404 });
    }

    const response = NextResponse.json(detail);
    const cacheTime = 3600;
    response.headers.set(
      'Cache-Control',
      `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    );
    response.headers.set('CDN-Cache-Control', `public, s-maxage=${cacheTime}`);

    return response;
  } catch (error) {
    console.error('获取漫画详情失败:', error);
    return NextResponse.json({ error: '获取详情失败' }, { status: 500 });
  }
}
