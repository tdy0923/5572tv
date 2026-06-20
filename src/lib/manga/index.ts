import {
  getMangaBzChapterPages,
  getMangaBzDetail,
  searchMangaBz,
} from './mangabz';
import {
  getMangadexChapterPages,
  getMangadexDetail,
  searchMangadex,
} from './mangadex';
import { getEnabledSources, type MangaSource } from './sources';
import type {
  MangaChapterPages,
  MangaDetail,
  MangaSearchResult,
} from './types';

export { getEnabledSources, getSourceByKey, MANGA_SOURCES } from './sources';
export type {
  MangaChapterPages,
  MangaDetail,
  MangaPage,
  MangaSearchResult,
} from './types';

const SEARCH_TIMEOUT = 8000;

async function searchSingleSource(
  source: MangaSource,
  query: string,
  page: number,
): Promise<{ results: MangaSearchResult[]; totalPages: number }> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), SEARCH_TIMEOUT),
    );

    let searchFn: (
      q: string,
      p: number,
    ) => Promise<{ results: MangaSearchResult[]; totalPages: number }>;

    switch (source.key) {
      case 'mangabz':
        searchFn = searchMangaBz;
        break;
      case 'mangadex':
        searchFn = searchMangadex;
        break;
      default:
        return { results: [], totalPages: 0 };
    }

    return await Promise.race([searchFn(query, page), timeoutPromise]);
  } catch {
    return { results: [], totalPages: 0 };
  }
}

export async function searchManga(
  query: string,
  page: number = 1,
): Promise<{
  results: MangaSearchResult[];
  totalResults: number;
  totalPages: number;
}> {
  const sources = getEnabledSources();

  const results = await Promise.allSettled(
    sources.map((source) => searchSingleSource(source, query, page)),
  );

  const allResults: MangaSearchResult[] = [];
  let maxPages = 1;
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value.results);
      if (result.value.totalPages > maxPages) {
        maxPages = result.value.totalPages;
      }
    }
  });

  return {
    results: allResults,
    totalResults: allResults.length,
    totalPages: maxPages,
  };
}

export async function getMangaDetail(
  id: string,
  source: string,
): Promise<MangaDetail | null> {
  switch (source) {
    case 'mangabz':
      return getMangaBzDetail(id);
    case 'mangadex':
      return getMangadexDetail(id);
    default:
      return null;
  }
}

export async function getChapterPages(
  chapterUrl: string,
  source: string,
): Promise<MangaChapterPages | null> {
  switch (source) {
    case 'mangabz':
      return getMangaBzChapterPages(chapterUrl);
    case 'mangadex':
      return getMangadexChapterPages(chapterUrl);
    default:
      return null;
  }
}
