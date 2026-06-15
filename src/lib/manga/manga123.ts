import * as cheerio from 'cheerio';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

import type {
  MangaChapter,
  MangaChapterPages,
  MangaDetail,
  MangaPage,
  MangaSearchResult,
} from './types';

const BASE_URL = 'https://www.manga123.com';
const SOURCE_KEY = 'manga123';
const SOURCE_NAME = 'Manga123';

const HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Referer: BASE_URL + '/',
};

export async function searchManga123(
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
      '.manga-list .manga-item, .search-list .manga-item, .listupd .bs, .listupd .bsx, .book-list .book-item',
    ).each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a').first();
      const href = linkEl.attr('href') || '';
      const title =
        $el.find('.manga-title, .book-title, h3, h2').first().text().trim() ||
        linkEl.attr('title') ||
        linkEl.text().trim();
      const coverImg =
        $el.find('img').first().attr('src') ||
        $el.find('img').first().attr('data-src') ||
        '';
      const author = $el
        .find('.manga-author, .book-author, .author')
        .text()
        .trim();
      const latestChapter = $el
        .find('.manga-chapter, .book-chapter, .chapter')
        .text()
        .trim();
      const status = $el
        .find('.manga-status, .book-status, .status')
        .text()
        .trim();

      if (title && href) {
        const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
        const idMatch = href.match(/\/(\w+)/);
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

export async function getManga123Detail(
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
      $('h1, .manga-info h1, .book-info h1').first().text().trim() || '';
    const cover =
      $('img.manga-cover, .manga-info img, .book-info img')
        .first()
        .attr('src') || '';
    const description = $(
      '.manga-desc, .manga-info .desc, .book-info-detail .text',
    )
      .text()
      .trim();
    const author = $('.manga-author, .manga-info .author, .book-info .author')
      .first()
      .text()
      .trim()
      .replace(/^作者[：:]\s*/, '');
    const status = $('.manga-status, .manga-info .status, .book-info .status')
      .first()
      .text()
      .trim();

    const chapters: MangaChapter[] = [];

    const chapterListSelector = [
      '.chapter-list li a',
      '.manga-chapter-list li a',
      '#chapter-list li a',
      '.detail-chapter-list li a',
      '.list-chapter a',
      '.chapterlist a',
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

export async function getManga123ChapterPages(
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
      '.manga-read img',
      '#manga img',
      '.reader-img img',
      '.chapter-content img',
      '.reading img',
      '#viewer img',
      '.comic-img img',
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
      'a:contains("上一话"), a:contains("上一章"), .prev a',
    ).first();
    const nextLink = $(
      'a:contains("下一话"), a:contains("下一章"), .next a',
    ).first();

    if (prevLink.length) {
      prevChapterId = prevLink.attr('href') || null;
    }
    if (nextLink.length) {
      nextChapterId = nextLink.attr('href') || null;
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
