// 播放页集数索引相关的纯逻辑，从 PlayPageClient 抽出以便单测，
// 并作为后续拆分的接缝。注意保留原有的两种不同钳制语义。

/** 解析数字型 URL 参数：缺失/非法一律回退 0。 */
export function parseNumericParam(raw: string | null): number {
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * 详情加载后的集数校正（initAll 语义）：
 * 越界（>= 总集数）时回到第 0 集，而非钳到最后一集。
 */
export function resolveIndexForDetail(index: number, total: number): number {
  if (total <= 0) return 0;
  return index >= total ? 0 : index;
}

/**
 * 历史记录目标集数钳制（initFromHistory 语义）：
 * 限制在 [0, total-1] 区间内。
 */
export function clampIndexToRange(index: number, total: number): number {
  const maxIndex = Math.max((total || 1) - 1, 0);
  return Math.min(Math.max(index, 0), maxIndex);
}
