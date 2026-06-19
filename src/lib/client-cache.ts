/* eslint-disable no-console */

// In-memory cache for client-side to avoid redundant HTTP requests
const memCache = new Map<string, { data: any; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<any>>();

function getMemCache(key: string): any | null {
  const entry = memCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  if (entry) memCache.delete(key);
  return null;
}

function setMemCache(key: string, data: any, ttlMs: number): void {
  memCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export class ClientCache {
  static async get(key: string): Promise<any | null> {
    // 1. Check in-memory cache first (~0ms)
    const memResult = getMemCache(key);
    if (memResult !== null) return memResult;

    // 2. Deduplicate concurrent requests for the same key
    const existing = pendingRequests.get(key);
    if (existing) return existing;

    // 3. Make HTTP request with deduplication
    const promise = (async () => {
      try {
        const response = await fetch(
          `/api/cache?key=${encodeURIComponent(key)}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // Cache in memory for 30 seconds to avoid redundant requests
        if (result.data !== null && result.data !== undefined) {
          setMemCache(key, result.data, 30000);
        }
        return result.data;
      } catch (error) {
        console.error('获取缓存失败:', error);
        return null;
      } finally {
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, promise);
    return promise;
  }

  static async set(
    key: string,
    data: any,
    expireSeconds?: number,
  ): Promise<void> {
    // Update in-memory cache immediately
    const ttlMs = (expireSeconds || 3600) * 1000;
    setMemCache(key, data, ttlMs);

    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, data, expireSeconds }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('设置缓存失败:', error);
      // Don't throw - cache set failure shouldn't break the app
    }
  }

  static async delete(key: string): Promise<void> {
    memCache.delete(key);
    try {
      const response = await fetch(
        `/api/cache?key=${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('删除缓存失败:', error);
    }
  }

  static async clearExpired(prefix?: string): Promise<void> {
    try {
      const url = prefix
        ? `/api/cache?prefix=${encodeURIComponent(prefix)}`
        : '/api/cache';
      const response = await fetch(url, {
        method: 'DELETE',
      });
      if (response.status === 401 || response.status === 403) {
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch {
      // Silent - cleanup failure is non-critical
    }
  }
}
