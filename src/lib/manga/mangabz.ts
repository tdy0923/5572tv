import * as cheerio from 'cheerio';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

import type {
  MangaChapter,
  MangaChapterPages,
  MangaDetail,
  MangaSearchResult,
} from './types';

const BASE_URL = 'https://www.mangabz.com';
const SOURCE_KEY = 'mangabz';
const SOURCE_NAME = 'MangaBZ';

const HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Referer: BASE_URL + '/',
};

export async function searchMangaBz(
  query: string,
  page: number = 1,
): Promise<{ results: MangaSearchResult[]; totalPages: number }> {
  // MangaBZ uses 'title' parameter, not 'keyword'
  const url = `${BASE_URL}/search?title=${encodeURIComponent(query)}&page=${page}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { results: [], totalPages: 0 };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: MangaSearchResult[] = [];

    $(
      '.mh-item, .search-list .mh-item, .book-list .mh-item, .listupd .bs, .listupd .bsx',
    ).each((_, el) => {
      const $el = $(el);
      const linkEl =
        $el.find('a').first() ||
        $el.find('.mh-item-detali-title a, .tt a, h2 a').first();
      const href = linkEl.attr('href') || '';
      const title =
        linkEl.text().trim() ||
        $el.find('.mh-item-detali-title, .tt, h2').text().trim();
      const coverImg =
        $el.find('img').first().attr('src') ||
        $el.find('img').first().attr('data-src') ||
        '';
      const author = $el
        .find('.mh-item-detali-author, .author, .inform .author')
        .text()
        .trim()
        .replace(/^作者[：:]\s*/, '');
      const latestChapter = $el
        .find('.mh-item-detali-chapter, .chapter, .epxs')
        .text()
        .trim();
      const status = $el
        .find('.mh-item-detali-status, .status, .status em')
        .text()
        .trim();

      if (title && href) {
        const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
        const idMatch = href.match(/\/(\d+)/);
        results.push({
          id: idMatch ? idMatch[1] : href,
          title,
          cover: coverImg,
          author: author || '未知',
          latestChapter: latestChapter || '',
          status: status || '未知',
          source: SOURCE_KEY,
          sourceName: SOURCE_NAME,
          url: fullUrl,
        });
      }
    });

    let totalPages = 1;
    const pageLinks = $('.page a, .pagination a, .pages a');
    pageLinks.each((_, el) => {
      const text = $(el).text().trim();
      const num = parseInt(text);
      if (!isNaN(num) && num > totalPages) {
        totalPages = num;
      }
    });

    return { results, totalPages };
  } catch {
    clearTimeout(timeoutId);
    return { results: [], totalPages: 0 };
  }
}

export async function getMangaBzDetail(
  idOrUrl: string,
): Promise<MangaDetail | null> {
  let url: string;
  if (idOrUrl.startsWith('http')) {
    url = idOrUrl;
  } else {
    // MangaBZ URL format: /manga/ID/ or /IDbz/
    url = `${BASE_URL}/${idOrUrl}bz/`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $('.detail-info-title').text().trim() ||
      $('h1').first().text().trim() ||
      '';

    // Extract cover
    const cover = $('.detail-info-cover').attr('src') || '';

    // Extract description
    const description = $('.detail-info-content')
      .text()
      .trim()
      .replace(/\[.*?\]/g, '') // Remove [+展開][-折疊] buttons
      .trim();

    // Extract author
    const author = $('.detail-info-tip span')
      .first()
      .text()
      .trim()
      .replace(/^作者[：:]\s*/, '');

    // Extract status
    const status = $('.detail-info-tip span:nth-child(2)')
      .text()
      .trim()
      .replace(/^狀態[：:]\s*/, '');

    // Extract rating
    const ratingText = $('.detail-info-stars span').text().trim();
    const rating = ratingText || '暂无评分';

    // Extract genres
    const genres: string[] = [];
    $('.detail-info-tip span').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('題材') || text.includes('题材')) {
        $(el)
          .find('.item, a')
          .each((_, item) => {
            const genre = $(item).text().trim();
            if (genre) genres.push(genre);
          });
      }
    });

    // Extract chapters (deduplicate by href)
    const chapterMap = new Map<string, MangaChapter>();
    $('a.detail-list-form-item, .mh-chapter-list li a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const title =
        $el.attr('title') ||
        $el
          .text()
          .trim()
          .replace(/\(\d+P\)/, '')
          .trim();

      if (href && title && !chapterMap.has(href)) {
        const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
        chapterMap.set(href, {
          id: href,
          title,
          url: fullUrl,
          source: SOURCE_KEY,
        });
      }
    });
    const chapters = Array.from(chapterMap.values());

    return {
      id: idOrUrl,
      title,
      cover,
      description,
      author: author || '未知',
      status: status || '未知',
      genres,
      rating,
      chapters,
      source: SOURCE_KEY,
      sourceName: SOURCE_NAME,
      url,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function getMangaBzChapterPages(
  chapterUrl: string,
): Promise<MangaChapterPages | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(chapterUrl, {
      headers: HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : '未知章节';

    // Extract global JS variables needed for image loading
    const cidMatch = html.match(/MANGABZ_CID\s*=\s*(\d+)/);
    const midMatch = html.match(/MANGABZ_MID\s*=\s*(\d+)/);
    const signMatch = html.match(/MANGABZ_VIEWSIGN\s*=\s*["']([^"']+)["']/);
    const dtMatch = html.match(/MANGABZ_VIEWSIGN_DT\s*=\s*["']([^"']+)["']/);
    const imageCountMatch = html.match(/MANGABZ_IMAGE_COUNT\s*=\s*(\d+)/);

    if (!cidMatch || !midMatch || !signMatch || !dtMatch || !imageCountMatch) {
      // Fallback: return chapter URL for browser-side rendering
      return {
        chapterId: chapterUrl,
        title,
        pages: [],
        prevChapterId: null,
        nextChapterId: null,
        source: SOURCE_KEY,
        chapterUrl,
      };
    }

    const cid = cidMatch[1];
    const mid = midMatch[1];
    const sign = signMatch[1];
    const dt = encodeURIComponent(dtMatch[1]);
    const imageCount = parseInt(imageCountMatch[1]);

    // Extract prev/next chapter links
    let prevChapterId: string | null = null;
    let nextChapterId: string | null = null;

    const prevMatch = html.match(
      /<a[^>]*href="([^"]*)"[^>]*class="[^"]*chapter-prev[^"]*"/,
    );
    const nextMatch = html.match(
      /<a[^>]*href="([^"]*)"[^>]*class="[^"]*chapter-next[^"]*"/,
    );

    if (prevMatch) {
      const prevUrl = prevMatch[1].startsWith('http')
        ? prevMatch[1]
        : BASE_URL + prevMatch[1];
      prevChapterId = prevUrl;
    }
    if (nextMatch) {
      const nextUrl = nextMatch[1].startsWith('http')
        ? nextMatch[1]
        : BASE_URL + nextMatch[1];
      nextChapterId = nextUrl;
    }

    // Fetch image URLs from chapterimage.ashx for each page
    const pages: { url: string; index: number }[] = [];
    const batchSize = 5;

    for (let i = 0; i < imageCount; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, imageCount); j++) {
        const page = j + 1;
        const imgUrl = `${BASE_URL}/chapterimage.ashx?cid=${cid}&page=${page}&key=&_cid=${cid}&_mid=${mid}&_dt=${dt}&_sign=${sign}`;
        batch.push(
          fetch(imgUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
            .then(async (res) => {
              if (!res.ok) return null;
              const js = await res.text();
              // Unpack P.A.C.K.E.D. JavaScript to extract image URL
              const imageUrl = unpackPacked(js);
              return imageUrl ? { url: imageUrl, index: j } : null;
            })
            .catch(() => null),
        );
      }

      const results = await Promise.all(batch);
      for (const result of results) {
        if (result) pages.push(result);
      }
    }

    // Sort by index
    pages.sort((a, b) => a.index - b.index);

    return {
      chapterId: chapterUrl,
      title,
      pages,
      prevChapterId,
      nextChapterId,
      source: SOURCE_KEY,
      chapterUrl,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// Unpack P.A.C.K.E.D. JavaScript to extract the first image URL
function unpackPacked(packedJs: string): string | null {
  try {
    // P.A.C.K.E.D. format: packed=CIPHER(k,d,l,p)
    // We need to find the base64 encoded string and decode it
    const match = packedJs.match(/packed\s*=\s*'([^']+)'/);
    if (!match) {
      // Try alternative: the response might directly contain image URL
      const urlMatch = packedJs.match(
        /https?:\/\/image\.mangabz\.com[^"'\s)]+\.(jpg|png|webp)/i,
      );
      return urlMatch ? urlMatch[0] : null;
    }

    // Simple P.A.C.K.E.D. unpacker
    const packed = match[1];
    const unpacked = unpack(packed);
    if (unpacked) {
      const urlMatch = unpacked.match(
        /https?:\/\/image\.mangabz\.com[^"'\s)]+\.(jpg|png|webp)/i,
      );
      return urlMatch ? urlMatch[0] : null;
    }

    return null;
  } catch {
    return null;
  }
}

// Minimal P.A.C.K.E.D. JavaScript unpacker
function unpack(packed: string): string | null {
  try {
    const parts = packed.match(/'([A-Za-z0-9+/=]+)'/);
    if (!parts) return null;

    const base64 = parts[1];
    const decoded = atob(base64);

    // Extract parameters from the packed format
    const keyStr =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/=';
    const keyIndex: Record<string, number> = {};
    for (let i = 0; i < keyStr.length; i++) {
      keyIndex[keyStr[i]] = i;
    }

    // This is a simplified unpacker for the specific format used by MangaBZ
    // The actual format is: function(p,a,c,k,e,d){...} where p is the payload
    // For our purposes, we just need to find the image URL in the decoded output

    // Try to find URL directly in decoded string
    const urlMatch = decoded.match(/https?:\/\/[^"'\s)]+\.(jpg|png|webp)/i);
    if (urlMatch) return urlMatch[0];

    // If that fails, try to find it in the packed string itself
    const urlMatch2 = packed.match(/https?:\/\/[^"'\s)]+\.(jpg|png|webp)/i);
    return urlMatch2 ? urlMatch2[0] : null;
  } catch {
    return null;
  }
}
