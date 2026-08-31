// 标题匹配用的纯归一化，从 useSourceSearch 抽出以便单测与去重。
// 归一化：小写 + 去除非字母数字/非中日韩字符。
// 修复点：原实现里查询侧未 toLowerCase、标题侧有，导致含拉丁字符的标题
// （如 "Friends" vs "friends"）精确匹配会漏；此处统一小写。
export function normalizeForMatch(s: string): string {
  return (s || '').toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '');
}
