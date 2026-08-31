import { useCallback } from 'react';

import { SearchResult } from '@/lib/types';

import { matchesYearAndType, normalizeForMatch } from '../title-match';

const safeStr = (v: any) => String(v || '');

const ADULT_KEYWORDS =
  /^(AV-|成人|伦理|福利|里番|R18|色情|情色|三级|性感|裸|性爱|艳情|18禁)/i;

const isAdultContent = (result: SearchResult): boolean => {
  if (ADULT_KEYWORDS.test(result.title)) return true;
  if (result.class && ADULT_KEYWORDS.test(result.class)) return true;
  if (result.type_name && ADULT_KEYWORDS.test(result.type_name)) return true;
  if (result.source_name && ADULT_KEYWORDS.test(result.source_name))
    return true;
  return false;
};

const checkAllKeywordsMatch = (
  queryTitle: string,
  resultTitle: string,
): boolean => {
  const queryWords = queryTitle
    .replace(/[^\w\s\u4e00-\u9fff]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);
  return queryWords.every((word) => resultTitle.includes(word));
};

const generateNumberVariants = (query: string): string[] => {
  const variants: string[] = [];

  const chineseNumbers: { [key: string]: string } = {
    一: '1',
    二: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10',
  };

  const seasonPattern = /第([一二三四五六七八九十\d]+)(季|部|集|期)/;
  const match = seasonPattern.exec(query);

  if (match) {
    const fullMatch = match[0];
    const number = match[1];
    const arabicNumber = chineseNumbers[number] || number;
    const base = query.replace(fullMatch, '').trim();

    if (base) {
      variants.push(`${base}${arabicNumber}`);
    }
  }

  const endNumberMatch = query.match(/^(.+?)\s*(\d+)$/);
  if (endNumberMatch) {
    const base = endNumberMatch[1].trim();
    const number = endNumberMatch[2];
    const chineseNum = [
      '',
      '一',
      '二',
      '三',
      '四',
      '五',
      '六',
      '七',
      '八',
      '九',
      '十',
    ][parseInt(number)];

    if (chineseNum && parseInt(number) <= 10) {
      variants.push(`${base}第${chineseNum}季`);
    }
  }

  return variants.slice(0, 1);
};

const generateChinesePunctuationVariants = (query: string): string[] => {
  const variants: string[] = [];

  const chinesePunctuation = /[：；，。！？、""''（）【】《》]/;
  if (!chinesePunctuation.test(query)) {
    return variants;
  }

  if (query.includes('：')) {
    const withSpace = query.replace(/：/g, ' ');
    variants.push(withSpace);

    const noColon = query.replace(/：/g, '');
    variants.push(noColon);

    const englishColon = query.replace(/：/g, ':');
    variants.push(englishColon);

    const beforeColon = query.split('：')[0].trim();
    if (beforeColon && beforeColon !== query) {
      variants.push(beforeColon);
    }

    const afterColon = query.split('：')[1]?.trim();
    if (afterColon) {
      variants.push(afterColon);
    }
  }

  let cleanedQuery = query;

  cleanedQuery = cleanedQuery.replace(/；/g, ';');
  cleanedQuery = cleanedQuery.replace(/，/g, ',');
  cleanedQuery = cleanedQuery.replace(/。/g, '.');
  cleanedQuery = cleanedQuery.replace(/！/g, '!');
  cleanedQuery = cleanedQuery.replace(/？/g, '?');
  cleanedQuery = cleanedQuery.replace(/"/g, '"');
  cleanedQuery = cleanedQuery.replace(/"/g, '"');
  cleanedQuery = cleanedQuery.replace(/'/g, "'");
  cleanedQuery = cleanedQuery.replace(/'/g, "'");
  cleanedQuery = cleanedQuery.replace(/（/g, '(');
  cleanedQuery = cleanedQuery.replace(/）/g, ')');
  cleanedQuery = cleanedQuery.replace(/【/g, '[');
  cleanedQuery = cleanedQuery.replace(/】/g, ']');
  cleanedQuery = cleanedQuery.replace(/《/g, '<');
  cleanedQuery = cleanedQuery.replace(/》/g, '>');

  if (cleanedQuery !== query) {
    variants.push(cleanedQuery);
  }

  const noPunctuation = query.replace(
    /[：；，。！？、""''（）【】《》:;,.!?"'()[\]<>]/g,
    '',
  );
  if (noPunctuation !== query && noPunctuation.trim()) {
    variants.push(noPunctuation);
  }

  return variants;
};

const generateSearchVariants = (originalQuery: string): string[] => {
  const variants: string[] = [];
  const trimmed = originalQuery.trim();

  variants.push(trimmed);

  const chinesePunctuationVariants =
    generateChinesePunctuationVariants(trimmed);
  chinesePunctuationVariants.forEach((variant) => {
    if (!variants.includes(variant)) {
      variants.push(variant);
    }
  });

  const numberVariants = generateNumberVariants(trimmed);
  numberVariants.forEach((variant) => {
    if (!variants.includes(variant)) {
      variants.push(variant);
    }
  });

  if (trimmed.includes(' ')) {
    const noSpaces = trimmed.replace(/\s+/g, '');
    if (noSpaces !== trimmed) {
      variants.push(noSpaces);
    }

    const normalizedSpaces = trimmed.replace(/\s+/g, ' ');
    if (normalizedSpaces !== trimmed && !variants.includes(normalizedSpaces)) {
      variants.push(normalizedSpaces);
    }

    const keywords = trimmed.split(/\s+/);
    if (keywords.length >= 2) {
      const mainKeyword = keywords[0];
      const lastKeyword = keywords[keywords.length - 1];

      if (/第|季|集|部|篇|章/.test(lastKeyword)) {
        const combined = mainKeyword + lastKeyword;
        if (!variants.includes(combined)) {
          variants.push(combined);
        }
      }

      const withColon = trimmed.replace(/\s+/g, '：');
      if (!variants.includes(withColon)) {
        variants.push(withColon);
      }

      const withEnglishColon = trimmed.replace(/\s+/g, ':');
      if (!variants.includes(withEnglishColon)) {
        variants.push(withEnglishColon);
      }

      const meaninglessWords = [
        'the',
        'a',
        'an',
        'and',
        'or',
        'of',
        'in',
        'on',
        'at',
        'to',
        'for',
        'with',
        'by',
      ];
      if (
        !variants.includes(mainKeyword) &&
        !meaninglessWords.includes(mainKeyword.toLowerCase()) &&
        mainKeyword.length > 2
      ) {
        variants.push(mainKeyword);
      }
    }
  }

  return Array.from(new Set(variants));
};

// ---------------------------------------------------------------------------
// 🚀 流式搜索（首命中即返）：消费 /api/search/ws 的逐源SSE，
// 第一个通过标题校验的结果立即 resolve，供播放页秒级开播；
// 其余源继续收集并通过 onProgress 增量上报，直到 complete。
// ---------------------------------------------------------------------------

export interface StreamSearchHandle {
  promise: Promise<SearchResult | null>;
  abort: () => void;
}

function titleMatches(result: SearchResult, queryTitle: string): boolean {
  const t = safeStr(result.title).replaceAll(' ', '').toLowerCase();
  if (!t) return false;
  if (t === queryTitle) return true;
  const strip = (x: string) => x.replace(/\d+|[：:]/g, '');
  return strip(t) === strip(queryTitle);
}

function looselyMatches(result: SearchResult, queryTitle: string): boolean {
  const t = safeStr(result.title).replaceAll(' ', '').toLowerCase();
  return (
    t.includes(queryTitle) ||
    queryTitle.includes(t) ||
    (queryTitle.length > 4 && checkAllKeywordsMatch(queryTitle, t))
  );
}

export function searchStreamingFirstHit(params: {
  query: string;
  videoYear?: string;
  searchType?: string;
  onProgress?: (all: SearchResult[]) => void;
}): StreamSearchHandle {
  const { query, onProgress } = params;
  let abortRequested = false;
  const controllerStub = { aborted: false };
  const abort = () => {
    abortRequested = true;
    controllerStub.aborted = true;
    readerRef.abort();
  };
  // 用可变容器持有 reader 以支持外部 abort
  const readerRef: { abort: () => void } = {
    abort: () => {
      abortRequested = true;
      controllerStub.aborted = true;
    },
  };

  const queryTitle = query.replaceAll(' ', '').toLowerCase();

  const promise = new Promise<SearchResult | null>(async (resolve) => {
    try {
      const res = await fetch(`/api/search/ws?q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'text/event-stream' },
      });
      if (!res.ok || !res.body) {
        resolve(null);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const all: SearchResult[] = [];
      let firstHit: SearchResult | null = null;
      let settled = false;

      const finish = (value: SearchResult | null) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };

      while (!controllerStub.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === 'source_result' && Array.isArray(evt.results)) {
              for (const r of evt.results as SearchResult[]) {
                if (isAdultContent(r)) continue;
                const k = `${safeStr(r.source)}|${safeStr(r.id)}`;
                if (
                  all.some((x) => `${safeStr(x.source)}|${safeStr(x.id)}` === k)
                )
                  continue;
                all.push(r);
                if (
                  !firstHit &&
                  titleMatches(r, queryTitle) &&
                  r.episodes?.length
                ) {
                  firstHit = r; // 立刻放行首个命中，流继续收集其余
                  finish(firstHit);
                }
              }
              onProgress?.(all.slice());
            } else if (evt.type === 'complete') {
              if (!firstHit) {
                // 无严格命中 → 宽松兜底挑一个有集数的
                firstHit =
                  all.find(
                    (r) => looselyMatches(r, queryTitle) && r.episodes?.length,
                  ) || null;
              }
              finish(firstHit);
            }
          } catch {}
          if (settled && !onProgress) break;
        }
        if (abortRequested) break;
      }
      // 流自然结束仍未 settle（无complete事件等）→ 兜底
      if (!settled) {
        const fallback =
          all.find((r) => titleMatches(r, queryTitle) && r.episodes?.length) ||
          all.find(
            (r) => looselyMatches(r, queryTitle) && r.episodes?.length,
          ) ||
          null;
        finish(fallback);
      }
      try {
        await reader.cancel();
      } catch {}
    } catch {
      resolve(null);
    }
  });

  return { promise, abort };
}

export function useSourceSearch(params: {
  videoTitleRef: React.MutableRefObject<string>;
  videoYearRef: React.MutableRefObject<string>;
  videoDoubanIdRef: React.MutableRefObject<number>;
  currentEpisodeRef: React.MutableRefObject<number>;
  searchType: string;
  signal: AbortSignal;
  availableSourcesRef: React.MutableRefObject<SearchResult[]>;
  searchTitle: string;
  videoTitle: string;
  currentSource: string;
  currentId: string;
  tryTrailerFallback: (query: string, results: SearchResult[]) => Promise<void>;
  setAvailableSourcesWithWeight: (
    sources: SearchResult[],
  ) => Promise<SearchResult[]>;
  setSourceSearchError: (error: string) => void;
  setAvailableSources: (sources: SearchResult[]) => void;
  setSourceSearchLoading: (loading: boolean) => void;
}) {
  const {
    videoTitleRef,
    videoYearRef,
    videoDoubanIdRef,
    searchType,
    signal,
    searchTitle,
    videoTitle,
    currentSource,
    currentId,
    tryTrailerFallback,
    setAvailableSourcesWithWeight,
    setSourceSearchError,
    setAvailableSources,
    setSourceSearchLoading,
  } = params;

  const fetchSourcesData = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      try {
        const effectiveQuery = (
          query ||
          searchTitle ||
          videoTitleRef.current ||
          videoTitle
        ).trim();

        if (!effectiveQuery) {
          console.warn('智能搜索跳过：无有效查询');
          return [];
        }

        const searchVariants = generateSearchVariants(effectiveQuery);

        const allResults: SearchResult[] = [];
        let bestResults: SearchResult[] = [];

        const matchYearAndType = (result: SearchResult) => {
          const episodes = Array.isArray(result.episodes)
            ? result.episodes
            : [];
          return matchesYearAndType({
            year: result.year,
            episodeCount: episodes.length,
            expectedYear: videoYearRef.current,
            searchType,
          });
        };

        for (const variant of searchVariants) {
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(variant)}`,
            { signal },
          );
          if (!response.ok) {
            console.warn(`搜索变体 "${variant}" 失败:`, response.statusText);
            continue;
          }
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            allResults.push(...data.results);

            const queryTitle = (effectiveQuery || videoTitleRef.current)
              .replaceAll(' ', '')
              .toLowerCase();

            const exactResults = data.results.filter((result: SearchResult) => {
              if (isAdultContent(result)) return false;
              if (
                videoDoubanIdRef.current &&
                videoDoubanIdRef.current > 0 &&
                result.douban_id
              ) {
                return result.douban_id === videoDoubanIdRef.current;
              }
              const resultTitle = result.title
                .replaceAll(' ', '')
                .toLowerCase();
              const exactMatch =
                resultTitle === queryTitle ||
                resultTitle.replace(/\d+|[：:]/g, '') ===
                  queryTitle.replace(/\d+|[：:]/g, '');
              return exactMatch && matchYearAndType(result);
            });

            let filteredResults = exactResults;
            if (exactResults.length === 0) {
              filteredResults = data.results.filter((result: SearchResult) => {
                if (isAdultContent(result)) return false;
                if (
                  videoDoubanIdRef.current &&
                  videoDoubanIdRef.current > 0 &&
                  result.douban_id
                ) {
                  return result.douban_id === videoDoubanIdRef.current;
                }
                const resultTitle = result.title
                  .replaceAll(' ', '')
                  .toLowerCase();
                const titleMatch =
                  resultTitle.includes(queryTitle) ||
                  queryTitle.includes(resultTitle) ||
                  (queryTitle.length > 4 &&
                    checkAllKeywordsMatch(queryTitle, resultTitle));
                return titleMatch && matchYearAndType(result);
              });
            }

            if (filteredResults.length > 0) {
              bestResults = filteredResults;
              break;
            }
          }
        }

        let finalResults = bestResults;

        if (bestResults.length === 0) {
          const queryTitle = (effectiveQuery || videoTitleRef.current)
            .toLowerCase()
            .trim();
          const allCandidates = allResults;

          const englishChars = (queryTitle.match(/[a-z\s]/g) || []).length;
          const chineseChars = (queryTitle.match(/[\u4e00-\u9fff]/g) || [])
            .length;
          const isEnglishQuery = englishChars > chineseChars;

          let relevantMatches;

          if (isEnglishQuery) {
            const queryWords = queryTitle
              .toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(
                (word) =>
                  word.length > 2 &&
                  ![
                    'the',
                    'a',
                    'an',
                    'and',
                    'or',
                    'of',
                    'in',
                    'on',
                    'at',
                    'to',
                    'for',
                    'with',
                    'by',
                  ].includes(word),
              );

            relevantMatches = allCandidates.filter((result) => {
              if (isAdultContent(result)) return false;
              const title = result.title.toLowerCase();
              const titleWords = title
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter((word) => word.length > 1);

              const matchedWords = queryWords.filter((queryWord) =>
                titleWords.some(
                  (titleWord) =>
                    titleWord.includes(queryWord) ||
                    queryWord.includes(titleWord) ||
                    (queryWord.length > 4 &&
                      titleWord.length > 4 &&
                      queryWord.substring(0, 4) === titleWord.substring(0, 4)),
                ),
              );

              const wordMatchRatio = matchedWords.length / queryWords.length;
              if (wordMatchRatio >= 0.75) {
                return true;
              }
              return false;
            });
          } else {
            const normalizedQuery = normalizeForMatch(queryTitle);

            const exactChinese = allCandidates.filter((result) => {
              if (isAdultContent(result)) return false;
              const normalizedTitle = normalizeForMatch(result.title);
              const isExact =
                normalizedTitle === normalizedQuery ||
                normalizedTitle.replace(/\d+/g, '') ===
                  normalizedQuery.replace(/\d+/g, '');
              if (isExact) return isExact;
            });

            if (exactChinese.length > 0) {
              relevantMatches = exactChinese;
            } else {
              relevantMatches = allCandidates.filter((result) => {
                if (isAdultContent(result)) return false;
                const normalizedTitle = normalizeForMatch(
                  safeStr(result.title),
                );

                if (
                  normalizedTitle.includes(normalizedQuery) ||
                  normalizedQuery.includes(normalizedTitle)
                ) {
                  return true;
                }

                const commonChars = Array.from(normalizedQuery).filter((char) =>
                  normalizedTitle.includes(char),
                ).length;
                const similarity = commonChars / normalizedQuery.length;
                if (similarity >= 0.8 && matchYearAndType(result)) {
                  return true;
                }
                return false;
              });
            }
          }

          if (relevantMatches.length > 0) {
            finalResults = Array.from(
              new Map(
                relevantMatches.map((item) => [
                  `${item.source}-${item.id}`,
                  item,
                ]),
              ).values(),
            ) as SearchResult[];
          } else {
            finalResults = Array.from(
              new Map(
                allCandidates.map((item) => [
                  `${item.source}-${item.id}`,
                  item,
                ]),
              ).values(),
            )
              .filter((r: SearchResult) => {
                if (isAdultContent(r)) return false;
                if (
                  videoDoubanIdRef.current &&
                  videoDoubanIdRef.current > 0 &&
                  r.douban_id &&
                  r.douban_id > 0
                ) {
                  return r.douban_id === videoDoubanIdRef.current;
                }
                return true;
              })
              .slice(0, 12) as SearchResult[];
          }
        }

        if (
          videoDoubanIdRef.current &&
          videoDoubanIdRef.current > 0 &&
          finalResults.length > 0 &&
          !currentSource &&
          !currentId
        ) {
          const hasDoubanMatch = finalResults.some(
            (r: SearchResult) => r.douban_id === videoDoubanIdRef.current,
          );
          if (!hasDoubanMatch) {
            console.warn(
              `[Play] 搜索"${effectiveQuery}"的结果与豆瓣ID(${videoDoubanIdRef.current})不匹配，拒绝展示不相关内容`,
            );
            finalResults = [];
          }
        }

        await tryTrailerFallback(effectiveQuery, finalResults);

        const sortedResults = await setAvailableSourcesWithWeight(finalResults);
        return sortedResults;
      } catch (err) {
        console.error('智能搜索失败:', err);
        setSourceSearchError(err instanceof Error ? err.message : '搜索失败');
        setAvailableSources([]);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    },
    [
      videoTitleRef,
      videoYearRef,
      videoDoubanIdRef,
      searchType,
      signal,
      searchTitle,
      videoTitle,
      currentSource,
      currentId,
      tryTrailerFallback,
      setAvailableSourcesWithWeight,
      setSourceSearchError,
      setAvailableSources,
      setSourceSearchLoading,
    ],
  );

  return { fetchSourcesData };
}
