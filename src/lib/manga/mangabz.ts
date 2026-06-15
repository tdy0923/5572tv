import * as cheerio from 'cheerio';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

import type {
  MangaChapter,
  MangaChapterPages,
  MangaDetail,
  MangaPage,
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
  const url = `${BASE_URL}/search?keyword=${encodeURIComponent(query)}&page=${page}`;

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
    url = `${BASE_URL}/manga/${idOrUrl}/`;
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

    const title =
      $('h1, .detail-info h1, .book-info h1').first().text().trim() || '';
    const cover =
      $('img.detail-info-cover, .book-info img, .detail-info img')
        .first()
        .attr('src') || '';
    const description = $(
      '.detail-info-content, .book-info-detail .text, .detail-info-desc',
    )
      .text()
      .trim();
    const author = $(
      '.detail-info-author, .book-info .author, .detail-info span',
    )
      .first()
      .text()
      .trim()
      .replace(/^作者[：:]\s*/, '');
    const status = $(
      '.detail-info-status, .book-info .status, .detail-info-right .status',
    )
      .first()
      .text()
      .trim();

    const chapters: MangaChapter[] = [];

    const chapterListSelector = [
      '#chapter-list-1 li a',
      '.chapter-list-1 li a',
      '.detail-chapter-list li a',
      '.mh-chapter-list li a',
      '#chapterlistbox li a',
      '.chapter-list a',
      '.list-chapter a',
    ].join(', ');

    $(chapterListSelector).each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const chapterTitle = $a.text().trim();
      if (href && chapterTitle) {
        const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
        chapters.push({
          id: href,
          title: chapterTitle,
          url: fullUrl,
          source: SOURCE_KEY,
        });
      }
    });

    chapters.reverse();

    return {
      id: idOrUrl,
      title,
      cover,
      description,
      author: author || '未知',
      status: status || '未知',
      source: SOURCE_KEY,
      sourceName: SOURCE_NAME,
      url,
      chapters,
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
    const $ = cheerio.load(html);

    const title = $('h1, .chapter-title, .reader-title').first().text().trim();

    const pages: MangaPage[] = [];

    const imgSelector = [
      '.manga-read img.manga-img',
      '#manga img',
      '.reader-img img',
      '.comic-img img',
      '.manga img[data-src]',
      '.chapter-content img',
      '#viewer img',
      '.reading img',
    ].join(', ');

    $(imgSelector).each((index, el) => {
      const $img = $(el);
      const src = $img.attr('src') || $img.attr('data-src') || '';
      if (src && !src.includes('logo') && !src.includes('icon')) {
        pages.push({
          url: src.startsWith('http') ? src : 'https:' + src,
          index,
        });
      }
    });

    let prevChapterId: string | null = null;
    let nextChapterId: string | null = null;

    const prevLink = $(
      'a:contains("上一话"), a:contains("上一章"), .prev a, a.prev',
    ).first();
    const nextLink = $(
      'a:contains("下一话"), a:contains("下一章"), .next a, a.next',
    ).first();

    if (prevLink.length) {
      const prevHref = prevLink.attr('href') || '';
      prevChapterId = prevHref || null;
    }
    if (nextLink.length) {
      const nextHref = nextLink.attr('href') || '';
      nextChapterId = nextHref || null;
    }

    return {
      chapterId: chapterUrl,
      title,
      pages,
      prevChapterId,
      nextChapterId,
      source: SOURCE_KEY,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
