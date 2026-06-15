export interface MangaSource {
  key: string;
  name: string;
  baseUrl: string;
  searchPath: string;
  enabled: boolean;
}

export const MANGA_SOURCES: MangaSource[] = [
  {
    key: 'mangabz',
    name: 'MangaBZ',
    baseUrl: 'https://www.mangabz.com',
    searchPath: '/search',
    enabled: true,
  },
  {
    key: 'manga123',
    name: 'Manga123',
    baseUrl: 'https://www.manga123.com',
    searchPath: '/search',
    enabled: true,
  },
];

export function getSourceByKey(key: string): MangaSource | undefined {
  return MANGA_SOURCES.find((s) => s.key === key);
}

export function getEnabledSources(): MangaSource[] {
  return MANGA_SOURCES.filter((s) => s.enabled);
}
