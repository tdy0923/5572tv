// 地域封锁 CDN 名单：这些 CDN 对海外服务器（VPS/CF）返回 403，
// 仅中国大陆 IP 可直接访问。Worker 侧依据此名单启用重试+中继池。
//
// 客户端策略（学习 LibreTV 全代理模式）：所有 m3u8/分片一律经服务端代理，
// 不再让浏览器直连问题CDN —— CORS/Referer/地域限制与浏览器彻底隔离。

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

// 播放地址统一走服务端代理
export function resolvePlaybackUrl(_url: string): string {
  return `/api/proxy/m3u8?url=${encodeURIComponent(_url)}`;
}
