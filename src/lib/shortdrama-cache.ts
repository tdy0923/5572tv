/* eslint-disable no-console */
/* eslint-disable unused-imports/no-unused-vars */

import { ClientCache } from './client-cache';
import { SHORTDRAMA_CACHE_SECONDS } from './shortdrama-constants';

// 短剧数据缓存配置（秒）- 从共享常量导入（兼容旧代码使用 SHORTDRAMA_CACHE_EXPIRE）
export const SHORTDRAMA_CACHE_EXPIRE = {
  ...SHORTDRAMA_CACHE_SECONDS,
  // 兼容旧代码中的 recommends 字段名
  recommends: SHORTDRAMA_CACHE_SECONDS.recommend,
};

// 缓存工具函数
function getCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return `shortdrama-${prefix}-${sortedParams}`;
}

// 统一缓存获取方法
async function getCache(key: string): Promise<any | null> {
  try {
    // 优先从统一存储获取
    const cached = await ClientCache.get(key);
    if (cached) return cached;

    // 兜底：从localStorage获取（兼容性）
    if (typeof localStorage !== 'undefined') {
      const localCached = localStorage.getItem(key);
      if (localCached) {
        try {
          const { data, expire } = JSON.parse(localCached);
          if (Date.now() <= expire) {
            return data;
          }
          localStorage.removeItem(key);
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }

    return null;
  } catch (e) {
    console.warn('获取短剧缓存失败:', e);
    return null;
  }
}

// 统一缓存设置方法
async function setCache(
  key: string,
  data: any,
  expireSeconds: number,
): Promise<void> {
  try {
    // 主要存储：统一存储
    await ClientCache.set(key, data, expireSeconds);

    // 兜底存储：localStorage（兼容性，短期缓存）
    if (typeof localStorage !== 'undefined') {
      try {
        const cacheData = {
          data,
          expire: Date.now() + expireSeconds * 1000,
          created: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
      } catch (e) {
        // localStorage可能满了，忽略错误
      }
    }
  } catch (e) {
    console.warn('设置短剧缓存失败:', e);
  }
}

// 清理过期缓存
async function cleanExpiredCache(): Promise<void> {
  try {
    // 清理统一存储中的过期缓存
    // 静默处理错误，避免在没有数据时产生401错误
    try {
      await ClientCache.clearExpired('shortdrama-');
    } catch (e) {
      // 静默处理：如果缓存为空或请求失败，不影响应用运行
      // 这是正常情况，不需要警告
    }

    // 清理localStorage中的过期缓存
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('shortdrama-')) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const { expire } = JSON.parse(cached);
              if (Date.now() > expire) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  } catch (e) {
    console.warn('清理短剧过期缓存失败:', e);
  }
}

// 强制清除推荐缓存（用于修复缓存了空数据的情况）
async function clearRecommendsCache(): Promise<void> {
  try {
    // 清除所有推荐相关的缓存key
    const cacheKey = getCacheKey('recommends', {});
    await ClientCache.delete(cacheKey);

    // 也清除带参数的缓存
    const cacheKeyWithSize = getCacheKey('recommends', { size: 8 });
    await ClientCache.delete(cacheKeyWithSize);

    // 清理localStorage中的推荐缓存
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('shortdrama-recommends')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    //     console.log('短剧推荐缓存已清除');
  } catch (e) {
    console.warn('清除短剧推荐缓存失败:', e);
  }
}

// 初始化缓存系统（参考豆瓣实现）
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
let initialized = false;

async function initShortdramaCache(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Defer cleanup to avoid module-load HTTP requests
  // Wait 5 seconds before first cleanup to let page finish loading
  setTimeout(async () => {
    await cleanExpiredCache();

    // 每1小时清理一次过期缓存（清理旧的防止热重载泄漏）
    if (cleanupIntervalId) clearInterval(cleanupIntervalId);
    cleanupIntervalId = setInterval(() => cleanExpiredCache(), 60 * 60 * 1000);
  }, 5000);
}

// Only init in browser, but defer it
if (typeof window !== 'undefined') {
  // Use requestIdleCallback to defer non-critical init
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      initShortdramaCache().catch(console.error);
    });
  } else {
    setTimeout(() => {
      initShortdramaCache().catch(console.error);
    }, 1000);
  }
}

export {
  cleanExpiredCache,
  clearRecommendsCache,
  getCache,
  getCacheKey,
  setCache,
};
