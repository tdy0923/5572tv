// 播放进度百分比的纯计算，从 ContinueWatching / UserMenu 抽出（此前两处重复实现）。

/** 返回 0-100 的播放进度百分比；无有效总时长时返回 0。 */
export function computeProgressPercent(record: {
  play_time: number;
  total_time: number;
}): number {
  if (!record.total_time || record.total_time <= 0) return 0;
  return (record.play_time / record.total_time) * 100;
}
