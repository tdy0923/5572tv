import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
  }

  try {
    const url = `https://m.douban.com/rexxar/api/v2/search?q=${encodeURIComponent(query)}&start=0&count=5`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
        Referer: 'https://m.douban.com/',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Douban API error' }, { status: 502 });
    }

    const data = await response.json();
    const items = (data?.items || []).slice(0, 3).map((item: any) => ({
      id: item?.target?.id ? parseInt(item.target.id, 10) : 0,
      title: item?.target?.title || '',
      year: item?.target?.year || '',
      type: item?.target?.type || item?.target?.subtype || '',
      cover: item?.target?.cover_url || item?.target?.pic?.normal || '',
    }));

    // 过滤出有效结果
    const valid = items.filter((i: any) => i.id > 0 && i.title);

    return NextResponse.json({ results: valid });
  } catch (err) {
    console.error('豆瓣搜索失败:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
