import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  Referer: 'https://search.bilibili.com/',
  Accept: 'application/json',
};

interface BiliVideoResult {
  bvid: string;
  title: string;
  duration: string;
  play: number;
  pic: string;
  author: string;
}

async function searchBilibiliTrailer(
  title: string,
  type: 'movie' | 'tv' = 'movie',
): Promise<{ bvid: string; title: string; embedUrl: string } | null> {
  const query = type === 'movie' ? `${title} 预告` : `${title} 预告`;
  const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}&order=click&page=1&pagesize=10`;

  try {
    const resp = await fetch(url, {
      headers: BILI_HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const results: BiliVideoResult[] = data?.data?.result || [];

    // 找到标题最匹配的预告片
    const trailer =
      results.find((v) => {
        const t = v.title.replace(/<[^>]+>/g, '');
        return (
          t.includes(title) &&
          (t.includes('预告') ||
            t.includes('trailer') ||
            t.includes('PV') ||
            t.includes('预告片'))
        );
      }) ||
      results.find((v) => v.title.replace(/<[^>]+>/g, '').includes(title));

    if (!trailer) return null;

    return {
      bvid: trailer.bvid,
      title: trailer.title.replace(/<[^>]+>/g, ''),
      embedUrl: `https://player.bilibili.com/player.html?bvid=${trailer.bvid}&page=1&autoplay=1`,
    };
  } catch (err) {
    console.warn('[Bilibili搜索] 搜索失败:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv';

  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
  }

  try {
    const result = await searchBilibiliTrailer(query, type);
    if (!result) {
      return NextResponse.json({ error: '未找到预告片' }, { status: 404 });
    }
    return NextResponse.json({ code: 200, data: result });
  } catch (err) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
