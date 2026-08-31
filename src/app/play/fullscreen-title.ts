import { escapeAudioTrackHtml } from './utils';

/**
 * 构造播放器全屏标题/集数图层的 HTML（纯函数，便于单测与去重）。
 * 标题与集名来自第三方采集源，一律做 HTML 转义，避免注入。
 * @param episodeIndex 0 基集序号
 */
export function buildFullscreenTitleHtml(params: {
  title: string;
  episodeName: string;
  episodeIndex: number;
  hasEpisodes: boolean;
}): string {
  const { title, episodeName, episodeIndex, hasEpisodes } = params;
  const safeTitle = escapeAudioTrackHtml(title || '');
  const episodeSpan = hasEpisodes
    ? `<span class="fullscreen-episode-text">${
        episodeName
          ? escapeAudioTrackHtml(episodeName)
          : `第 ${episodeIndex + 1} 集`
      }</span>`
    : '';

  return `
      <div class="fullscreen-title-container">
        <div class="fullscreen-title-content">
          <h1 class="fullscreen-title-text">${safeTitle}</h1>
          ${episodeSpan}
        </div>
      </div>
    `;
}
