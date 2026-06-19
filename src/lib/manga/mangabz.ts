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
      // MangaBZ search results: author is not available, latest chapter is in .chapter
      const author = $el
        .find('.mh-item-detali-author, .author, .inform .author')
        .text()
        .trim()
        .replace(/^作者[：:]\s*/, '');
      // Extract latest chapter from .chapter class or .epxs
      const latestChapter = $el
        .find('.chapter a, .mh-item-detali-chapter a, .epxs')
        .first()
        .text()
        .trim()
        .replace(/^\s*(最新|完結|完结)\s*/, '');
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

// P.A.C.K.E.D. JavaScript unpacker
// MangaBZ chapterimage.ashx returns: eval(function(p,a,c,k,e,d){...}('payload', a, c, 'dict'.split('|'), 0, {}))
function unpackPackedResponse(js: string): string[] {
  const urls: string[] = [];
  try {
    // Match the eval(function(...){...}(args)) pattern
    const evalMatch = js.match(
      /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)\s*\{[\s\S]*?\}\s*\(\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\.split\s*\(\s*'\|'\s*\)/,
    );
    if (!evalMatch) return urls;

    const payload = evalMatch[1];
    const base = parseInt(evalMatch[2]);
    const count = parseInt(evalMatch[3]);
    const dictionary = evalMatch[4].split('|');

    // P.A.C.K.E.D. substitution decode
    const decoded: Record<string, string> = {};
    const baseChars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/=';

    function encode(num: number): string {
      if (num === 0) return baseChars[0];
      let result = '';
      let n = num;
      while (n > 0) {
        result = baseChars[n % base] + result;
        n = Math.floor(n / base);
      }
      return result;
    }

    // Build dictionary mapping
    for (let i = 0; i < count; i++) {
      const key = encode(i);
      decoded[key] = dictionary[i] || '';
    }

    // Perform substitution on payload
    const words = payload.split(/\b/);
    const result = words
      .map((word) => {
        if (word.length > 0 && decoded[word] !== undefined) {
          return decoded[word];
        }
        return word;
      })
      .join('');

    // Extract all image URLs from decoded result
    const urlMatches = result.matchAll(
      /https?:\/\/image\.mangabz\.com[^"'\s\\)]+\.(jpg|png|webp|jpeg)/gi,
    );
    for (const match of urlMatches) {
      urls.push(match[0]);
    }

    // Also try to find pix (base URL) and individual paths
    const pixMatch = result.match(/pix\s*=\s*["']([^"']+)["']/);
    if (pixMatch) {
      const pix = pixMatch[1];
      // Find paths like "1/139/418076/1_1743.jpg"
      const pathMatches = result.matchAll(
        /(\d+\/\d+\/\d+\/\d+_\d+\.(?:jpg|png|webp|jpeg))/g,
      );
      for (const pathMatch of pathMatches) {
        const fullUrl = pix + pathMatch[1];
        if (!urls.includes(fullUrl)) {
          urls.push(fullUrl);
        }
      }
    }
  } catch {
    // ignore
  }
  return urls;
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

    // Extract prev/next chapter links from MangaBZ's actual navigation structure
    let prevChapterId: string | null = null;
    let nextChapterId: string | null = null;

    // MangaBZ uses data attributes or specific link patterns for navigation
    // Try multiple patterns to find prev/next chapters
    const prevPatterns = [
      /<a[^>]*href="([^"]*)"[^>]*class="[^"]*mh-prevchapter[^"]*"/,
      /<a[^>]*href="([^"]*)"[^>]*>\s*上一话/,
      /<a[^>]*href="([^"]*)"[^>]*>\s*上一章/,
    ];
    const nextPatterns = [
      /<a[^>]*href="([^"]*)"[^>]*class="[^"]*mh-nextchapter[^"]*"/,
      /<a[^>]*href="([^"]*)"[^>]*>\s*下一话/,
      /<a[^>]*href="([^"]*)"[^>]*>\s*下一章/,
    ];

    for (const pattern of prevPatterns) {
      const match = html.match(pattern);
      if (match) {
        prevChapterId = match[1].startsWith('http')
          ? match[1]
          : BASE_URL + match[1];
        break;
      }
    }
    for (const pattern of nextPatterns) {
      const match = html.match(pattern);
      if (match) {
        nextChapterId = match[1].startsWith('http')
          ? match[1]
          : BASE_URL + match[1];
        break;
      }
    }

    // Fetch all image URLs - each chapterimage.ashx call returns ~2 images
    // We need ceil(imageCount/2) + 1 calls to get all unique images
    const allUrls = new Map<number, string>();
    const fetchCount = Math.ceil(imageCount / 2) + 1;

    // Fetch in parallel batches
    const fetchPromises = [];
    for (let page = 1; page <= fetchCount; page++) {
      const url = `${BASE_URL}/chapterimage.ashx?cid=${cid}&page=${page}&key=&_cid=${cid}&_mid=${mid}&_dt=${dt}&_sign=${sign}`;
      fetchPromises.push(
        fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
          .then(async (res) => {
            if (!res.ok) return;
            const js = await res.text();
            const urls = unpackPackedResponse(js);
            // Each response may contain multiple image URLs, assign them to page indices
            urls.forEach((imageUrl, offset) => {
              const pageIndex = (page - 1) * 2 + offset;
              if (pageIndex < imageCount && !allUrls.has(pageIndex)) {
                allUrls.set(pageIndex, imageUrl);
              }
            });
          })
          .catch(() => {}),
      );
    }

    await Promise.all(fetchPromises);

    // If unpacking didn't work, try fetching page by page (fallback)
    if (allUrls.size === 0) {
      for (let page = 1; page <= imageCount; page++) {
        const url = `${BASE_URL}/chapterimage.ashx?cid=${cid}&page=${page}&key=&_cid=${cid}&_mid=${mid}&_dt=${dt}&_sign=${sign}`;
        try {
          const res = await fetch(url, {
            headers: HEADERS,
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) continue;
          const js = await res.text();
          const urls = unpackPackedResponse(js);
          if (urls.length > 0) {
            allUrls.set(page - 1, urls[0]);
          }
        } catch {
          // skip
        }
      }
    }

    // Build pages array
    const pages = Array.from(allUrls.entries())
      .sort(([a], [b]) => a - b)
      .map(([index, url]) => ({ url, index }));

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
