import { NextResponse } from 'next/server';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.mangabz.com';

// MangaBZ 漫画分类 - 使用正确的 URL 格式 /manga-list-{genre}-{status}-{page}/
const MANGA_GENRES = [
  { id: 'hot', name: '热门漫画', path: '/manga-list/' },
  { id: 'new', name: '最新更新', path: '/manga-list-0-0-2/' },
  { id: 'finish', name: '已完结', path: '/manga-list-0-2-10/' },
  { id: 'action', name: '热血动作', path: '/manga-list-31-0-10/' },
  { id: 'romance', name: '恋爱日常', path: '/manga-list-26-0-10/' },
  { id: 'campus', name: '校园青春', path: '/manga-list-1-0-10/' },
  { id: 'adventure', name: '冒险穿越', path: '/manga-list-2-0-10/' },
  { id: 'scifi', name: '科幻机甲', path: '/manga-list-25-0-10/' },
  { id: 'life', name: '生活日常', path: '/manga-list-11-0-10/' },
  { id: 'suspense', name: '悬疑惊悚', path: '/manga-list-17-0-10/' },
  { id: 'fantasy', name: '魔法奇幻', path: '/manga-list-15-0-10/' },
  { id: 'sports', name: '运动竞技', path: '/manga-list-34-0-10/' },
];

interface GenreManga {
  id: string;
  title: string;
  cover: string;
  latestChapter: string;
  url: string;
}

async function fetchGenreManga(
  path: string,
  limit = 10,
): Promise<GenreManga[]> {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Referer: BASE_URL + '/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();

    const results: GenreManga[] = [];

    // MangaBZ list page structure:
    // <div class="mh-item">
    //   <a href="/139bz/">
    //     <img class="mh-cover" src="https://cover.mangabz.com/...">
    //   </a>
    //   <div class="mh-item-detali">
    //     <h2 class="title"><a href="/139bz/" title="海賊王">海賊王</a></h2>
    //   </div>
    // </div>
    const itemRegex =
      /<div class="mh-item">\s*<a href="([^"]+)">\s*<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h2 class="title">\s*<a[^>]*>([^<]+)<\/a>/g;

    let match;
    while ((match = itemRegex.exec(html)) !== null && results.length < limit) {
      const href = match[1];
      const cover = match[2];
      const title = match[3].trim();
      const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
      const idMatch = href.match(/\/(\d+)/);

      if (title && idMatch) {
        results.push({
          id: idMatch[1],
          title,
          cover,
          latestChapter: '',
          url: fullUrl,
        });
      }
    }

    // Fallback: try simpler parser
    if (results.length === 0) {
      const simpleRegex =
        /<div class="mh-item">\s*<a href="([^"]+)">\s*<img[^>]*src="([^"]+)"[\s\S]*?<a[^>]*title="([^"]+)"/g;
      while (
        (match = simpleRegex.exec(html)) !== null &&
        results.length < limit
      ) {
        const href = match[1];
        const cover = match[2];
        const title = match[3].trim();
        const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
        const idMatch = href.match(/\/(\d+)/);

        if (title && idMatch) {
          results.push({
            id: idMatch[1],
            title,
            cover,
            latestChapter: '',
            url: fullUrl,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Fetch manga for each genre in parallel (limit concurrency)
    const results: Record<string, GenreManga[]> = {};
    const batchSize = 4;

    for (let i = 0; i < MANGA_GENRES.length; i += batchSize) {
      const batch = MANGA_GENRES.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (genre) => {
          const manga = await fetchGenreManga(genre.path, 10);
          return { id: genre.id, manga };
        }),
      );

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results[result.value.id] = result.value.manga;
        }
      });
    }

    const response = NextResponse.json({
      genres: MANGA_GENRES.map((g) => ({
        id: g.id,
        name: g.name,
        manga: results[g.id] || [],
      })),
    });

    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600',
    );
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=3600');

    return response;
  } catch {
    return NextResponse.json({ error: '获取分类失败' }, { status: 500 });
  }
}
