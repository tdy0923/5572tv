import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DOUBAN_API = 'https://movie.douban.com/j/search_subjects';

// 内存缓存 — trending数据5分钟内不重复请求豆瓣API
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = 'trending:all';

function getCached() {
  const entry = cache.get(CACHE_KEY);
  if (entry && entry.expires > Date.now()) return entry.data;
  return null;
}

function setCache(data: unknown) {
  cache.set(CACHE_KEY, { data, expires: Date.now() + CACHE_TTL });
}

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
    // 优先返回缓存
    const cached = getCached();
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
          'X-Cache': 'HIT',
        },
      });
    }

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

    const result = {
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
    };

    setCache(result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('获取热门内容失败:', error);
    return NextResponse.json({ results: [] });
  }
}
