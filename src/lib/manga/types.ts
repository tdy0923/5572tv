export interface MangaSearchResult {
  id: string;
  title: string;
  cover: string;
  author: string;
  latestChapter: string;
  status: string;
  source: string;
  sourceName: string;
  url: string;
}

export interface MangaDetail {
  id: string;
  title: string;
  cover: string;
  description: string;
  author: string;
  status: string;
  source: string;
  sourceName: string;
  url: string;
  chapters: MangaChapter[];
}

export interface MangaChapter {
  id: string;
  title: string;
  url: string;
  source: string;
}

export interface MangaPage {
  url: string;
  index: number;
}

export interface MangaChapterPages {
  chapterId: string;
  title: string;
  pages: MangaPage[];
  prevChapterId: string | null;
  nextChapterId: string | null;
  source: string;
}
