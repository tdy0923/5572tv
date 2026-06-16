/* eslint-disable no-console */

/**
 * PanSou Network Disk Search
 * Based on DecoTV implementation
 *
 * Aggregates network disk resource searches
 */

import { DEFAULT_USER_AGENT } from './user-agent';

export interface PanSouResult {
  title: string;
  url: string;
  source: string;
  size?: string;
  date?: string;
}

export interface PanSouConfig {
  serverUrl: string;
  token?: string;
  username?: string;
  password?: string;
}

// Default PanSou nodes
const DEFAULT_PANSOU_NODES: PanSouConfig[] = [
  { serverUrl: 'https://pansou.katelya.eu.org/' },
];

// In-memory cache
const searchCache = new Map<
  string,
  { results: PanSouResult[]; timestamp: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Build auth headers
 */
function buildAuthHeaders(config: PanSouConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_USER_AGENT,
    Accept: 'application/json',
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  } else if (config.username && config.password) {
    const auth = Buffer.from(`${config.username}:${config.password}`).toString(
      'base64',
    );
    headers['Authorization'] = `Basic ${auth}`;
  }

  return headers;
}

/**
 * Search using a single PanSou node
 */
async function searchNode(
  config: PanSouConfig,
  keyword: string,
  timeout: number = 10000,
): Promise<PanSouResult[]> {
  try {
    const searchUrl = `${config.serverUrl}api/search?keyword=${encodeURIComponent(keyword)}`;

    const response = await fetch(searchUrl, {
      headers: buildAuthHeaders(config),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Parse results based on API format
    const results: PanSouResult[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        results.push({
          title: item.title || item.name || '',
          url: item.url || item.link || '',
          source: item.source || item.from || 'unknown',
          size: item.size || '',
          date: item.date || item.time || '',
        });
      }
    } else if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        results.push({
          title: item.title || item.name || '',
          url: item.url || item.link || '',
          source: item.source || item.from || 'unknown',
          size: item.size || '',
          date: item.date || item.time || '',
        });
      }
    }

    return results;
  } catch (e) {
    console.error(`PanSou search failed for ${config.serverUrl}:`, e);
    return [];
  }
}

/**
 * Search across multiple PanSou nodes
 */
export async function searchPanSou(
  keyword: string,
  nodes: PanSouConfig[] = DEFAULT_PANSOU_NODES,
  concurrency: number = 3,
): Promise<PanSouResult[]> {
  // Check cache
  const cacheKey = `pansou:${keyword}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  // Search all nodes
  const allResults: PanSouResult[] = [];

  for (let i = 0; i < nodes.length; i += concurrency) {
    const batch = nodes.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((node) => searchNode(node, keyword)),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      }
    }
  }

  // Deduplicate by URL
  const uniqueResults = Array.from(
    new Map(allResults.map((r) => [r.url, r])).values(),
  );

  // Cache results
  searchCache.set(cacheKey, {
    results: uniqueResults,
    timestamp: Date.now(),
  });

  return uniqueResults;
}

/**
 * Check if a PanSou node is available
 */
export async function checkNodeHealth(
  config: PanSouConfig,
  timeout: number = 5000,
): Promise<boolean> {
  try {
    const healthUrl = `${config.serverUrl}api/health`;
    const response = await fetch(healthUrl, {
      headers: buildAuthHeaders(config),
      signal: AbortSignal.timeout(timeout),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Clear search cache
 */
export function clearSearchCache(): void {
  searchCache.clear();
}
