// 客户端安全的 CDN 域名策略管理（无 Node.js 依赖）

const cdnBlocklist = new Map<string, number>();

const BLOCK_TTL = 300000; // 5 分钟阻断缓存

export function getCdnDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function isCdnBlocked(domain: string): boolean {
  const blockedAt = cdnBlocklist.get(domain);
  if (!blockedAt) return false;
  if (Date.now() - blockedAt > BLOCK_TTL) {
    cdnBlocklist.delete(domain);
    return false;
  }
  return true;
}

export function blockCdnDomain(domain: string): void {
  cdnBlocklist.set(domain, Date.now());
}

export function unblockCdnDomain(domain: string): void {
  cdnBlocklist.delete(domain);
}
