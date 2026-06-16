/* eslint-disable no-console */

/**
 * External Player Support
 * Based on LunaTV implementation
 *
 * Supports launching videos in external players
 */

export interface ExternalPlayer {
  id: string;
  name: string;
  protocol: string;
  icon: string;
  platforms: ('windows' | 'macos' | 'linux' | 'ios' | 'android')[];
  buildUrl: (videoUrl: string, title?: string) => string;
}

// Supported external players
export const EXTERNAL_PLAYERS: ExternalPlayer[] = [
  {
    id: 'potplayer',
    name: 'PotPlayer',
    protocol: 'potplayer',
    icon: '🎬',
    platforms: ['windows'],
    buildUrl: (url, title) => `potplayer://${encodeURIComponent(url)}`,
  },
  {
    id: 'vlc',
    name: 'VLC',
    protocol: 'vlc',
    icon: '🟠',
    platforms: ['windows', 'macos', 'linux', 'ios', 'android'],
    buildUrl: (url, title) => `vlc://${encodeURIComponent(url)}`,
  },
  {
    id: 'mpv',
    name: 'MPV',
    protocol: 'mpv',
    icon: '🎞️',
    platforms: ['windows', 'macos', 'linux'],
    buildUrl: (url, title) => `mpv://${encodeURIComponent(url)}`,
  },
  {
    id: 'iina',
    name: 'IINA',
    protocol: 'iina',
    icon: '🎯',
    platforms: ['macos'],
    buildUrl: (url, title) => `iina://weblink?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'nplayer',
    name: 'nPlayer',
    protocol: 'nplayer',
    icon: '📱',
    platforms: ['ios', 'android'],
    buildUrl: (url, title) => `nplayer-${url}`,
  },
  {
    id: 'mxplayer',
    name: 'MX Player',
    protocol: 'intent',
    icon: '播放',
    platforms: ['android'],
    buildUrl: (url, title) =>
      `intent:#Intent;action=android.intent.action.VIEW;type=video/*;S.data=${encodeURIComponent(url)};end`,
  },
  {
    id: 'infuse',
    name: 'Infuse',
    protocol: 'infuse',
    icon: '💜',
    platforms: ['ios', 'macos'],
    buildUrl: (url, title) =>
      `infuse://x-callback-url/play?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'fileball',
    name: 'Fileball',
    protocol: 'fileball',
    icon: '📂',
    platforms: ['ios'],
    buildUrl: (url, title) => `fileball://play?url=${encodeURIComponent(url)}`,
  },
];

/**
 * Detect current platform
 */
export function detectPlatform():
  | 'windows'
  | 'macos'
  | 'linux'
  | 'ios'
  | 'android'
  | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/mac os/.test(ua)) return 'macos';
  if (/linux/.test(ua)) return 'linux';

  return 'unknown';
}

/**
 * Get available players for current platform
 */
export function getAvailablePlayers(): ExternalPlayer[] {
  const platform = detectPlatform();
  return EXTERNAL_PLAYERS.filter((p) => p.platforms.includes(platform as any));
}

/**
 * Launch external player
 */
export function launchExternalPlayer(
  player: ExternalPlayer,
  videoUrl: string,
  title?: string,
): boolean {
  try {
    const url = player.buildUrl(videoUrl, title);

    // Create hidden iframe to trigger protocol handler
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    // Remove iframe after a short delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);

    return true;
  } catch (e) {
    console.error('Failed to launch external player:', e);
    return false;
  }
}

/**
 * Get player recommendation based on platform
 */
export function getRecommendedPlayer(): ExternalPlayer | null {
  const players = getAvailablePlayers();

  if (players.length === 0) return null;

  // Priority order
  const priority = [
    'iina',
    'infuse',
    'potplayer',
    'vlc',
    'mpv',
    'nplayer',
    'mxplayer',
    'fileball',
  ];

  for (const id of priority) {
    const player = players.find((p) => p.id === id);
    if (player) return player;
  }

  return players[0];
}
