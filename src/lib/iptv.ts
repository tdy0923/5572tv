/* eslint-disable no-console */

/**
 * IPTV/EPG System
 * Based on LunaTV implementation
 *
 * Supports:
 * - M3U/M3U8 playlist parsing
 * - TVBox TXT format parsing
 * - EPG (Electronic Program Guide) parsing
 * - Channel management
 */

import { DEFAULT_USER_AGENT } from './user-agent';

export interface IPTVChannel {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
}

export interface EPGProgram {
  channel: string;
  title: string;
  start: string;
  end: string;
  description?: string;
}

export interface EPGData {
  channels: Map<string, EPGProgram[]>;
  lastUpdate: number;
}

// In-memory EPG cache
const epgCache = new Map<string, EPGData>();
const EPG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Parse M3U/M3U8 playlist
 */
export function parseM3U(content: string): IPTVChannel[] {
  const channels: IPTVChannel[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      const info: Partial<IPTVChannel> = {};

      // Extract tvg-id
      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
      if (tvgIdMatch) info.tvgId = tvgIdMatch[1];

      // Extract tvg-name
      const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
      if (tvgNameMatch) info.tvgName = tvgNameMatch[1];

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
            tvgId: info.tvgId,
            tvgName: info.tvgName,
          });
        }
      }
    }
  }

  return channels;
}

/**
 * Parse TVBox TXT format
 * Format: channel_name,url
 * Groups: group,#genre#
 */
export function parseTVBoxTXT(content: string): IPTVChannel[] {
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
 * Parse EPG XML (XMLTV format)
 */
export async function parseEPG(url: string): Promise<EPGData> {
  // Check cache
  const cached = epgCache.get(url);
  if (cached && Date.now() - cached.lastUpdate < EPG_CACHE_TTL) {
    return cached;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`EPG fetch failed: ${response.status}`);
    }

    const text = await response.text();
    const programs = parseEPGXML(text);

    const epgData: EPGData = {
      channels: programs,
      lastUpdate: Date.now(),
    };

    // Cache the result
    epgCache.set(url, epgData);

    return epgData;
  } catch (e) {
    console.error('Failed to parse EPG:', e);
    return { channels: new Map(), lastUpdate: 0 };
  }
}

/**
 * Parse EPG XML content
 */
function parseEPGXML(xml: string): Map<string, EPGProgram[]> {
  const channels = new Map<string, EPGProgram[]>();

  // Simple regex-based parsing (not full XML parser)
  // Match <programme> tags
  const programmeRegex =
    /<programme[^>]+start="([^"]+)"[^>]+stop="([^"]+)"[^>]+channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
  let match;

  while ((match = programmeRegex.exec(xml)) !== null) {
    const [, start, stop, channel, content] = match;

    // Extract title
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract description
    const descMatch = content.match(/<desc[^>]*>([^<]+)<\/desc>/);
    const description = descMatch ? descMatch[1] : '';

    if (!channels.has(channel)) {
      channels.set(channel, []);
    }

    channels.get(channel)!.push({
      channel,
      title,
      start: formatEPGTime(start),
      end: formatEPGTime(stop),
      description,
    });
  }

  return channels;
}

/**
 * Format EPG time to ISO string
 */
function formatEPGTime(time: string): string {
  // Format: 20240101120000 +0800
  const match = time.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return time;

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Get current program for a channel
 */
export function getCurrentProgram(
  epg: EPGData,
  channelId: string,
): EPGProgram | null {
  const programs = epg.channels.get(channelId);
  if (!programs) return null;

  const now = new Date();
  return (
    programs.find((p) => {
      const start = new Date(p.start);
      const end = new Date(p.end);
      return now >= start && now < end;
    }) || null
  );
}

/**
 * Get programs for a channel within time range
 */
export function getPrograms(
  epg: EPGData,
  channelId: string,
  start: Date,
  end: Date,
): EPGProgram[] {
  const programs = epg.channels.get(channelId);
  if (!programs) return [];

  return programs.filter((p) => {
    const pStart = new Date(p.start);
    const pEnd = new Date(p.end);
    return pStart < end && pEnd > start;
  });
}
