import type {
  MangaChapter,
  MangaChapterPages,
  MangaDetail,
  MangaSearchResult,
} from './types';

const BASE_URL = 'https://api.mangadex.org';
const SOURCE_KEY = 'mangadex';
const SOURCE_NAME = 'MangaDex';
const COVER_URL = 'https://uploads.mangadex.org/covers';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
};

interface MangaDexManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    status: string;
    year: number | null;
    tags: Array<{ attributes: { name: Record<string, string> } }>;
  };
  relationships: Array<{
    id: string;
    type: string;
    attributes?: { fileName?: string };
  }>;
}

function getMangaTitle(manga: MangaDexManga): string {
  const title = manga.attributes.title;
  return (
    title.en ||
    title.ja ||
    title['ja-ro'] ||
    title.zh ||
    title.ko ||
    Object.values(title)[0] ||
    'Unknown'
  );
}

function getMangaCover(manga: MangaDexManga): string {
  const coverRel = manga.relationships.find((r) => r.type === 'cover_art');
  if (coverRel?.attributes?.fileName) {
    return `${COVER_URL}/${manga.id}/${coverRel.attributes.fileName}.256.jpg`;
  }
  return '';
}

function getStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ongoing: '连载中',
    completed: '已完结',
    hiatus: '暂停',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}

export async function searchMangadex(
  query: string,
  page: number = 1,
): Promise<{ results: MangaSearchResult[]; totalPages: number }> {
  const limit = 20;
  const offset = (page - 1) * limit;
  const url = `${BASE_URL}/manga?title=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&order[relevance]=desc&includes[]=cover_art`;

  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { results: [], totalPages: 0 };
    }

    const data = await response.json();
    const total = data.total || 0;
    const totalPages = Math.ceil(total / limit);

    const results: MangaSearchResult[] = (data.data || []).map(
      (manga: MangaDexManga) => ({
        id: manga.id,
        title: getMangaTitle(manga),
        cover: getMangaCover(manga),
        author: '',
        latestChapter: '',
        status: getStatus(manga.attributes.status),
        source: SOURCE_KEY,
        sourceName: SOURCE_NAME,
        url: `https://mangadex.org/title/${manga.id}`,
      }),
    );

    return { results, totalPages };
  } catch {
    return { results: [], totalPages: 0 };
  }
}

export async function getMangadexDetail(
  id: string,
): Promise<MangaDetail | null> {
  try {
    const url = `${BASE_URL}/manga/${id}?includes[]=cover_art&includes[]=author`;
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const manga = data.data as MangaDexManga;
    if (!manga) return null;

    // Get author
    const authorRel = manga.relationships.find((r) => r.type === 'author');
    const author = authorRel?.attributes
      ? (authorRel.attributes as any).name || ''
      : '';

    // Get description
    const desc = manga.attributes.description;
    const description =
      desc.en || desc.ja || desc.zh || Object.values(desc)[0] || '';

    // Get genres
    const genres = manga.attributes.tags
      .map(
        (t) =>
          t.attributes.name.en ||
          t.attributes.name.ja ||
          Object.values(t.attributes.name)[0] ||
          '',
      )
      .filter(Boolean);

    // Get chapters
    const chaptersUrl = `${BASE_URL}/manga/${id}/feed?limit=100&order[chapter]=desc&translatedLanguage[]=en&translatedLanguage[]=zh`;
    const chaptersResponse = await fetch(chaptersUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    const chaptersData = await chaptersResponse.json();
    const chapters: MangaChapter[] = (chaptersData.data || []).map(
      (ch: any) => ({
        id: ch.id,
        title: ch.attributes.title || `Chapter ${ch.attributes.chapter || ''}`,
        url: `https://mangadex.org/chapter/${ch.id}`,
        source: SOURCE_KEY,
      }),
    );

    return {
      id: manga.id,
      title: getMangaTitle(manga),
      cover: getMangaCover(manga),
      description,
      author: author || '未知',
      status: getStatus(manga.attributes.status),
      genres,
      rating: '',
      chapters,
      source: SOURCE_KEY,
      sourceName: SOURCE_NAME,
      url: `https://mangadex.org/title/${manga.id}`,
    };
  } catch {
    return null;
  }
}

export async function getMangadexChapterPages(
  chapterId: string,
): Promise<MangaChapterPages | null> {
  try {
    // Extract chapter ID from URL if full URL provided
    const id = chapterId.includes('/chapter/')
      ? chapterId.split('/chapter/')[1]
      : chapterId;

    const url = `${BASE_URL}/at-home/server/${id}`;
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const baseUrl = data.baseUrl;
    const chapterHash = data.chapter.hash;
    const pages = data.chapter.data || [];

    if (!baseUrl || pages.length === 0) return null;

    const pageUrls = pages.map(
      (page: string) => `${baseUrl}/data/${chapterHash}/${page}`,
    );

    return {
      chapterId: id,
      title: '',
      pages: pageUrls.map((url: string, index: number) => ({ url, index })),
      prevChapterId: null,
      nextChapterId: null,
      source: SOURCE_KEY,
    };
  } catch {
    return null;
  }
}
