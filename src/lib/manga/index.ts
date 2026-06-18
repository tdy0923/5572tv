import {
  getMangaBzChapterPages,
  getMangaBzDetail,
  searchMangaBz,
} from './mangabz';
import { getEnabledSources, getSourceByKey, type MangaSource } from './sources';
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
): Promise<MangaSearchResult[]> {
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
      default:
        return [];
    }

    const result = await Promise.race([searchFn(query, page), timeoutPromise]);
    return result.results;
  } catch {
    return [];
  }
}

export async function searchManga(
  query: string,
  page: number = 1,
): Promise<{ results: MangaSearchResult[]; totalResults: number }> {
  const sources = getEnabledSources();

  const results = await Promise.allSettled(
    sources.map((source) => searchSingleSource(source, query, page)),
  );

  const allResults: MangaSearchResult[] = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    }
  });

  return {
    results: allResults,
    totalResults: allResults.length,
  };
}

export async function getMangaDetail(
  id: string,
  source: string,
): Promise<MangaDetail | null> {
  const mangaSource = getSourceByKey(source);
  if (!mangaSource) return null;

  switch (source) {
    case 'mangabz':
      return getMangaBzDetail(id);
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
    default:
      return null;
  }
}
