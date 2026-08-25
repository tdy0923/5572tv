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

// 读取 user_info cookie 中的角色（纯浏览器实现，避免引入 next/server 依赖）
// 服务端写/删 /api/cache 仅允许 owner/admin，客户端据此门控，避免必 401 的无效请求
function getClientRole(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';').reduce(
      (acc, cookie) => {
        const trimmed = cookie.trim();
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          acc[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
        }
        return acc;
      },
      {} as Record<string, string>,
    );
    const info = cookies['user_info'];
    if (!info) return null;
    return (
      (JSON.parse(decodeURIComponent(info)) as { role?: string })?.role ?? null
    );
  } catch {
    return null;
  }
}

function isLoggedIn(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return (
      document.cookie.includes('user_auth=') ||
      document.cookie.includes('auth=')
    );
  } catch {
    return false;
  }
}

function isOwnerOrAdmin(): boolean {
  const role = getClientRole();
  return role === 'owner' || role === 'admin';
}

export class ClientCache {
  static async get(key: string): Promise<any | null> {
    // 1. Check in-memory cache first (~0ms)
    const memResult = getMemCache(key);
    if (memResult !== null) return memResult;

    // 2. Deduplicate concurrent requests for the same key
    const existing = pendingRequests.get(key);
    if (existing) return existing;

    // 3. 服务端 GET 仅登录用户可读，未登录直接走公开接口兜底，跳过无效请求
    if (!isLoggedIn()) return null;

    // 4. Make HTTP request with deduplication
    const promise = (async () => {
      let responseStatus = 0;
      try {
        const response = await fetch(
          `/api/cache?key=${encodeURIComponent(key)}`,
        );
        responseStatus = response.status;
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
        // 401/403 = 未登录/无权限读取服务端缓存，属于可预期的降级
        //（数据仍会走公开接口兜底），静默处理避免控制台刷屏
        if (responseStatus !== 401 && responseStatus !== 403) {
          console.warn('缓存读取失败:', error);
        }
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

    // 服务端 POST 仅 owner/admin 可写，其余角色仅维护内存缓存即可
    if (!isOwnerOrAdmin()) return;

    let responseStatus = 0;
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, data, expireSeconds }),
      });
      responseStatus = response.status;
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      // 401/403 静默：未登录用户不能写服务端缓存，内存缓存已足够
      if (responseStatus !== 401 && responseStatus !== 403) {
        console.warn('设置缓存失败:', error);
      }
      // Don't throw - cache set failure shouldn't break the app
    }
  }

  static async delete(key: string): Promise<void> {
    memCache.delete(key);

    // 服务端 DELETE 仅 owner/admin 可操作
    if (!isOwnerOrAdmin()) return;

    let responseStatus = 0;
    try {
      const response = await fetch(
        `/api/cache?key=${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
        },
      );
      responseStatus = response.status;
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (responseStatus !== 401 && responseStatus !== 403) {
        console.warn('删除缓存失败:', error);
      }
    }
  }

  static async clearExpired(prefix?: string): Promise<void> {
    // 服务端 DELETE 仅 owner/admin 可操作，其余用户跳过，避免必 401 的无效请求
    if (!isOwnerOrAdmin()) return;
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
