/* eslint-disable no-console */

/**
 * IPTV/EPG API
 * Supports M3U/M3U8 playlist parsing and EPG data
 */

import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

interface IPTVChannel {
  name: string;
  url: string;
  logo?: string;
  group?: string;
}

/**
 * Parse M3U/M3U8 playlist
 */
function parseM3U(content: string): IPTVChannel[] {
  const channels: IPTVChannel[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const info: Partial<IPTVChannel> = {};

      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      if (logoMatch) info.logo = logoMatch[1];

      // Extract group-title
      const groupMatch = line.match(/group-title="([^"]+)"/);
      if (groupMatch) info.group = groupMatch[1];

      // Extract channel name (after last comma)
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch) info.name = nameMatch[1].trim();

      // Next line should be the URL
      if (i + 1 < lines.length) {
        const url = lines[i + 1].trim();
        if (url && !url.startsWith('#')) {
          channels.push({
            name: info.name || 'Unknown',
            url,
            logo: info.logo,
            group: info.group,
          });
        }
      }
    }
  }

  return channels;
}

/**
 * Parse TVBox TXT format
 */
function parseTVBoxTXT(content: string): IPTVChannel[] {
  const channels: IPTVChannel[] = [];
  const lines = content.split('\n');
  let currentGroup = '默认';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for group header
    if (trimmed.includes('#genre#')) {
      currentGroup = trimmed.split(',')[0].trim();
      continue;
    }

    // Parse channel
    const parts = trimmed.split(',');
    if (parts.length >= 2) {
      channels.push({
        name: parts[0].trim(),
        url: parts[1].trim(),
        group: currentGroup,
      });
    }
  }

  return channels;
}

/**
 * Fetch and parse IPTV source
 */
async function fetchIPTVSource(url: string): Promise<IPTVChannel[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const content = await response.text();

  // Detect format
  if (content.includes('#EXTINF:')) {
    return parseM3U(content);
  } else if (content.includes('#genre#')) {
    return parseTVBoxTXT(content);
  }

  return [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 },
      );
    }

    const channels = await fetchIPTVSource(url);

    return NextResponse.json(
      {
        ok: true,
        total: channels.length,
        channels,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
  } catch (error) {
    console.error('IPTV fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IPTV source' },
      { status: 500 },
    );
  }
}
