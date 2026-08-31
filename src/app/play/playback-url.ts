import { appendAudioStreamIndex } from './utils';

/**
 * 纯函数：把某一集的原始播放地址转换成实际喂给播放器的地址。
 * - Emby 源：带偏好音轨时追加 AudioStreamIndex 参数，且不做 m3u8 代理包装。
 * - 其它源的 .m3u8：非本站地址时包装成 /api/proxy/m3u8 透传（带来源头）。
 * 从 PlayPageClient 抽出，便于单测并作为后续拆分的接缝。
 */
export function buildEpisodePlaybackUrl(params: {
  episodeData: string;
  source: string;
  audioTrackIndex: number; // -1 表示不指定音轨
  host: string; // window.location.host
}): string {
  const { episodeData, source, audioTrackIndex, host } = params;
  let newUrl = episodeData || '';

  const isEmbySource = source === 'emby' || source.startsWith('emby_');
  if (isEmbySource && newUrl && audioTrackIndex >= 0) {
    newUrl = appendAudioStreamIndex(newUrl, audioTrackIndex);
  }

  if (
    newUrl &&
    newUrl.includes('.m3u8') &&
    !newUrl.includes(host) &&
    !isEmbySource
  ) {
    const encodedUrl = encodeURIComponent(newUrl);
    newUrl = source
      ? `/api/proxy/m3u8?url=${encodedUrl}&5572tv-source=${encodeURIComponent(source)}`
      : `/api/proxy/m3u8?url=${encodedUrl}`;
  }

  return newUrl;
}
