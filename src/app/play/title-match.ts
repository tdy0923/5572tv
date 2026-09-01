// 标题匹配用的纯归一化，从 useSourceSearch 抽出以便单测与去重。
// 归一化：小写 + 去除非字母数字/非中日韩字符。
// 修复点：原实现里查询侧未 toLowerCase、标题侧有，导致含拉丁字符的标题
// （如 "Friends" vs "friends"）精确匹配会漏；此处统一小写。
export function normalizeForMatch(s: string): string {
  return (s || '').toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '');
}

/**
 * 纯判定：候选结果的年份/类型是否与期望一致（用于"选对片"的相关性过滤）。
 * - 未指定期望年份 → 年份放行。
 * - searchType 'tv' 要求多集；'movie' 要求单集；未指定 → 放行。
 */
export function matchesYearAndType(params: {
  year: string | number | undefined;
  episodeCount: number;
  expectedYear: string;
  searchType: string;
}): boolean {
  const { year, episodeCount, expectedYear, searchType } = params;
  const yearMatch = expectedYear
    ? String(year || '').toLowerCase() === String(expectedYear).toLowerCase()
    : true;
  const typeMatch = searchType
    ? (searchType === 'tv' && episodeCount > 1) ||
      (searchType === 'movie' && episodeCount === 1)
    : true;
  return yearMatch && typeMatch;
}

const ENGLISH_STOPWORDS = new Set([
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
]);

/** 查询是否以英文为主（英文字符数 > 中文字符数）。 */
export function isEnglishQuery(queryTitle: string): boolean {
  const q = (queryTitle || '').toLowerCase();
  const englishChars = (q.match(/[a-z\s]/g) || []).length;
  const chineseChars = (q.match(/[\u4e00-\u9fff]/g) || []).length;
  return englishChars > chineseChars;
}

function tokenizeWords(s: string, minLen: number): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > minLen);
}

/**
 * 英文查询与候选标题的词匹配判定：去停用词后，
 * 命中词占比 >= 0.75 视为匹配（含子串与 4 字前缀近似）。
 */
export function matchesEnglishQuery(
  queryTitle: string,
  title: string,
): boolean {
  const queryWords = tokenizeWords(queryTitle, 2).filter(
    (w) => !ENGLISH_STOPWORDS.has(w),
  );
  if (queryWords.length === 0) return false;
  const titleWords = tokenizeWords(title, 1);

  const matched = queryWords.filter((queryWord) =>
    titleWords.some(
      (titleWord) =>
        titleWord.includes(queryWord) ||
        queryWord.includes(titleWord) ||
        (queryWord.length > 4 &&
          titleWord.length > 4 &&
          queryWord.substring(0, 4) === titleWord.substring(0, 4)),
    ),
  );
  return matched.length / queryWords.length >= 0.75;
}
