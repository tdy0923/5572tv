// 地域封锁 CDN 名单：这些 CDN 对海外服务器（VPS/CF/Deno）返回 403，
// 仅中国大陆 IP 可访问。相关 URL 必须绕过服务端代理、由浏览器直连。
export const GEO_BLOCKED_CDNS = [
  'yzzyssvip',
  'yzzyvip',
  'vvvip-plays',
  'high20-playback',
  'high23-playback',
  'yzzy32-play',
  'power34play',
  'ijycnd.com',
];

export function isGeoBlockedCdn(url: string): boolean {
  return GEO_BLOCKED_CDNS.some((cdn) => url.includes(cdn));
}

// 播放用：地域封锁 CDN 直连，其余走服务端代理
export function resolvePlaybackUrl(url: string): string {
  return isGeoBlockedCdn(url)
    ? url
    : `/api/proxy/m3u8?url=${encodeURIComponent(url)}`;
}
