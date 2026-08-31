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
