/**
 * 登录过期全局通知（单例去重）。
 *
 * 数据请求 401 时调用 notifySessionExpired()，由挂载在 PageLayout 的
 * SessionExpiredModal 统一弹窗。成功请求会自动复位，确保下次过期仍能提醒。
 */

let notified = false;
let interceptorInstalled = false;

// 这些端点 401 是正常业务语义（不是过期），绝不弹：
const QUIET_PATHS = ['/api/login', '/api/logout', '/api/register'];

function shouldIgnore(url: string): boolean {
  try {
    const path = new URL(url, 'http://x').pathname;
    if (QUIET_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
      return true;
    }
    if (
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/login')
    ) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

export function notifySessionExpired(): void {
  if (typeof window === 'undefined' || notified) return;
  notified = true;
  window.dispatchEvent(new CustomEvent('session-expired'));
}

export function resetSessionExpiredNotify(): void {
  notified = false;
}

/**
 * 全局 401 拦截：不管哪层发起的请求（db.client、TanStack queryFn、裸 fetch），
 * 过期一律只弹一次窗。幂等，可重复调用。
 */
export function installGlobal401Interceptor(): void {
  if (
    typeof window === 'undefined' ||
    interceptorInstalled ||
    typeof window.fetch !== 'function'
  ) {
    return;
  }
  interceptorInstalled = true;
  const rawFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const resp = await rawFetch(input, init);
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (resp.status === 401 && !shouldIgnore(url)) {
        notifySessionExpired();
      } else if (resp.ok) {
        resetSessionExpiredNotify();
      }
    } catch {
      // 绝不干扰正常请求
    }
    return resp;
  }) as typeof window.fetch;
}
