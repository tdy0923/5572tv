/* eslint-disable no-console */

/**
 * Favorites Update Checker
 * Based on LunaTV implementation
 *
 * Automatically checks for new episodes of favorited content
 */

import { DEFAULT_USER_AGENT } from './user-agent';

interface FavoriteUpdate {
  id: string;
  title: string;
  source: string;
  currentEpisodes: number;
  newEpisodes: number;
  hasUpdate: boolean;
  poster?: string;
}

/**
 * Check if a source has new episodes for a favorited item
 */
export async function checkSourceUpdate(
  sourceApi: string,
  videoId: string,
  currentEpisodes: number,
): Promise<FavoriteUpdate | null> {
  try {
    const url = `${sourceApi}?ac=detail&ids=${videoId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.list || data.list.length === 0) return null;

    const item = data.list[0];
    const playUrl = item.vod_play_url || '';

    // Count episodes
    const episodes = playUrl
      .split('#')
      .filter((ep: string) => ep.includes('$'));
    const newEpisodes = episodes.length;

    return {
      id: videoId,
      title: item.vod_name || '',
      source: sourceApi,
      currentEpisodes,
      newEpisodes,
      hasUpdate: newEpisodes > currentEpisodes,
      poster: item.vod_pic || '',
    };
  } catch (e) {
    console.error(`Failed to check update for ${videoId}:`, e);
    return null;
  }
}

/**
 * Batch check updates for multiple favorites
 */
export async function checkBatchUpdates(
  favorites: Array<{
    id: string;
    source: string;
    currentEpisodes: number;
  }>,
  concurrency: number = 5,
): Promise<FavoriteUpdate[]> {
  const results: FavoriteUpdate[] = [];

  // Process in batches
  for (let i = 0; i < favorites.length; i += concurrency) {
    const batch = favorites.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((fav) =>
        checkSourceUpdate(fav.source, fav.id, fav.currentEpisodes),
      ),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    // Small delay between batches
    if (i + concurrency < favorites.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Get update summary
 */
export function getUpdateSummary(updates: FavoriteUpdate[]): {
  total: number;
  updated: number;
  items: FavoriteUpdate[];
} {
  const updated = updates.filter((u) => u.hasUpdate);
  return {
    total: updates.length,
    updated: updated.length,
    items: updated,
  };
}
