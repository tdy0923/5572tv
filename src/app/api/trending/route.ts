import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DOUBAN_API = 'https://movie.douban.com/j/search_subjects';

interface DoubanItem {
  rate: string;
  cover: string;
  title: string;
  url: string;
  id: string;
  episodes_info: string;
}

async function fetchDouban(
  type: string,
  tag: string,
  limit = 15,
): Promise<DoubanItem[]> {
  try {
    const res = await fetch(
      `${DOUBAN_API}?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${limit}&page_start=0`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://movie.douban.com/',
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.subjects || [];
  } catch {
    return [];
  }
}

export async function GET(_request: NextRequest) {
  try {
    const [movieItems, tvItems, animeItems, showItems] = await Promise.all([
      fetchDouban('movie', '热门', 15),
      fetchDouban('tv', '热门', 15),
      fetchDouban('movie', '动画', 15),
      fetchDouban('tv', '综艺', 10),
    ]);

    const toItems = (items: DoubanItem[], source: string) =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.cover,
        source,
        source_name: source,
        year: '',
        rate: item.rate,
        type_name: source,
      }));

    return NextResponse.json({
      results: [
        {
          source: 'douban',
          sourceName: '热门电影',
          items: toItems(movieItems, 'douban'),
        },
        {
          source: 'douban',
          sourceName: '热门剧集',
          items: toItems(tvItems, 'douban'),
        },
        {
          source: 'douban',
          sourceName: '新番放送',
          items: toItems(animeItems, 'douban'),
        },
        {
          source: 'douban',
          sourceName: '热门综艺',
          items: toItems(showItems, 'douban'),
        },
      ],
    });
  } catch (error) {
    console.error('获取热门内容失败:', error);
    return NextResponse.json({ results: [] });
  }
}
