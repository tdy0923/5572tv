// 纯函数：决定点击某集时应恢复到哪个时间点。
// 优先级：会话内权威 map > 记录里的 episode_times > 旧逻辑(记录恰指向该集用 play_time) > 0。
// 独立成模块便于单测，守护"按集恢复"逻辑不被回归。
export function pickEpisodeResumeTime(params: {
  sessionMap?: Record<number, number> | null;
  record?: {
    index: number;
    play_time: number;
    episode_times?: Record<number, number>;
  } | null;
  episodeNumber: number;
}): number {
  const { sessionMap, record, episodeNumber } = params;
  const perEpisode =
    sessionMap?.[episodeNumber + 1] ??
    record?.episode_times?.[episodeNumber + 1];
  if (perEpisode && perEpisode > 0) return perEpisode;
  if (record && record.index - 1 === episodeNumber && record.play_time > 0) {
    return record.play_time;
  }
  return 0;
}
