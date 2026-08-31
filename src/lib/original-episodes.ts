// "是否更新 original_episodes"的纯决策，从 db.client 抽出以便单测。
// original_episodes 是"用户开始追的集数基线"，用于计算"更新了几集"提醒；
// 只有当用户确实看到超过基线的集数、且有实质观看时长时才推进基线。
export function decideOriginalEpisodesUpdate(params: {
  originalEpisodes: number;
  newRecord: { index: number; play_time: number; total_episodes: number };
  freshTotalEpisodes: number;
}): { shouldUpdate: boolean; latestTotalEpisodes: number } {
  const { originalEpisodes, newRecord, freshTotalEpisodes } = params;

  const hasWatchedBeyondOriginal = newRecord.index > originalEpisodes;
  const hasSignificantProgress = newRecord.play_time > 60; // 观看超过 1 分钟

  if (!hasWatchedBeyondOriginal || !hasSignificantProgress) {
    return {
      shouldUpdate: false,
      latestTotalEpisodes: newRecord.total_episodes,
    };
  }

  return {
    shouldUpdate: true,
    latestTotalEpisodes: Math.max(
      freshTotalEpisodes,
      originalEpisodes,
      newRecord.total_episodes,
    ),
  };
}
