// 短剧死剧登记表（内存版，单容器部署无需持久化）
//
// 设计原则：
// - 信号来源是真实播放结果（客户端上报），不做服务端探测 —— 地域封锁CDN
//   从德国VPS探测必然全部误判为死（曾导致推荐被清空而回滚）
// - 降权不删除：推荐接口把死剧沉底而非过滤，避免误伤暂时抽风的源
// - 12小时自动过期：源站恢复链接后自然回到原位

const deadDramas = new Map<string, number>(); // name(小写) -> reportedAt
const DEAD_TTL = 12 * 60 * 60 * 1000;
const MAX_ENTRIES = 2000;

/** 上报死剧；返回 true 表示新登记 */
export function reportDeadDrama(name: string): boolean {
  const key = (name || '').trim().toLowerCase();
  if (!key) return false;
  const existed = deadDramas.has(key);
  deadDramas.set(key, Date.now());

  // 容量与过期清理
  if (deadDramas.size > MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, ts] of deadDramas) {
      if (now - ts > DEAD_TTL) deadDramas.delete(k);
    }
    // 仍超限则删最旧的
    if (deadDramas.size > MAX_ENTRIES) {
      const entries = [...deadDramas.entries()].sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < entries.length - MAX_ENTRIES; i++) {
        deadDramas.delete(entries[i][0]);
      }
    }
  }
  return !existed;
}

export function isDeadDrama(name: string): boolean {
  const key = (name || '').trim().toLowerCase();
  if (!key) return false;
  const ts = deadDramas.get(key);
  if (!ts) return false;
  if (Date.now() - ts > DEAD_TTL) {
    deadDramas.delete(key);
    return false;
  }
  return true;
}

/**
 * 死剧沉底排序：未上报的保持原序在前，已上报死剧按原相对顺序排在末尾。
 * 返回新数组，不改入参。
 */
export function sinkDeadDramas<T extends { name?: string }>(dramas: T[]): T[] {
  if (deadDramas.size === 0) return dramas;
  const alive: T[] = [];
  const dead: T[] = [];
  for (const d of dramas) {
    (isDeadDrama(d?.name || '') ? dead : alive).push(d);
  }
  return alive.length === dramas.length ? dramas : [...alive, ...dead];
}

/** 简易IP限流：每IP每小时最多20次上报 */
const reportLimiter = new Map<string, { count: number; resetAt: number }>();
export function isReportRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = reportLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    reportLimiter.set(ip, { count: 1, resetAt: now + 3600_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 20;
}
