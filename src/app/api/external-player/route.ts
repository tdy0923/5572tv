/* eslint-disable no-console */

/**
 * External Player API
 * Launches videos in external players
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ExternalPlayer {
  id: string;
  name: string;
  protocol: string;
  platforms: string[];
  buildUrl: (videoUrl: string, title?: string) => string;
}

// Supported external players
const EXTERNAL_PLAYERS: ExternalPlayer[] = [
  {
    id: 'potplayer',
    name: 'PotPlayer',
    protocol: 'potplayer',
    platforms: ['windows'],
    buildUrl: (url) => `potplayer://${encodeURIComponent(url)}`,
  },
  {
    id: 'vlc',
    name: 'VLC',
    protocol: 'vlc',
    platforms: ['windows', 'macos', 'linux', 'ios', 'android'],
    buildUrl: (url) => `vlc://${encodeURIComponent(url)}`,
  },
  {
    id: 'mpv',
    name: 'MPV',
    protocol: 'mpv',
    platforms: ['windows', 'macos', 'linux'],
    buildUrl: (url) => `mpv://${encodeURIComponent(url)}`,
  },
  {
    id: 'iina',
    name: 'IINA',
    protocol: 'iina',
    platforms: ['macos'],
    buildUrl: (url) => `iina://weblink?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'nplayer',
    name: 'nPlayer',
    protocol: 'nplayer',
    platforms: ['ios', 'android'],
    buildUrl: (url) => `nplayer-http://${url}`,
  },
  {
    id: 'mxplayer',
    name: 'MX Player',
    protocol: 'intent',
    platforms: ['android'],
    buildUrl: (url) =>
      `intent:#Intent;action=android.intent.action.VIEW;type=video/*;S.data=${encodeURIComponent(url)};end`,
  },
  {
    id: 'infuse',
    name: 'Infuse',
    protocol: 'infuse',
    platforms: ['ios', 'macos'],
    buildUrl: (url) =>
      `infuse://x-callback-url/play?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'fileball',
    name: 'Fileball',
    protocol: 'fileball',
    platforms: ['ios'],
    buildUrl: (url) => `fileball://play?url=${encodeURIComponent(url)}`,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const platform = searchParams.get('platform') || 'unknown';

    // Filter players by platform
    const availablePlayers = EXTERNAL_PLAYERS.filter(
      (p) => p.platforms.includes(platform) || p.platforms.includes('all'),
    );

    return NextResponse.json({
      ok: true,
      platform,
      players: availablePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        protocol: p.protocol,
        platforms: p.platforms,
      })),
    });
  } catch (error) {
    console.error('External player error:', error);
    return NextResponse.json(
      { error: 'Failed to get players' },
      { status: 500 },
    );
  }
}
