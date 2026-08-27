'use client';

// 客户端侧死链 CDN 主机追踪：命中 404/403/5xx 后在内存中标记，短期内跳过该主机
// 避免对同一批死链反复探活浪费时间。TTL 10 分钟后自动过期重试。

const DEAD_TTL_MS = 10 * 60 * 1000;
const deadHosts = new Map<string, number>();

function extractHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function markHostDead(url: string): void {
  const host = extractHost(url);
  if (!host) return;
  deadHosts.set(host, Date.now());
}

export function isHostDead(url: string): boolean {
  const host = extractHost(url);
  if (!host) return false;
  const ts = deadHosts.get(host);
  if (ts == null) return false;
  if (Date.now() - ts > DEAD_TTL_MS) {
    deadHosts.delete(host);
    return false;
  }
  return true;
}

export function clearDeadHosts(): void {
  deadHosts.clear();
}

export function getDeadHosts(): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (const [h, ts] of deadHosts) {
    if (now - ts <= DEAD_TTL_MS) out.push(h);
  }
  return out;
}
