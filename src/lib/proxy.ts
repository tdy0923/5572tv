/* eslint-disable unused-imports/no-unused-vars */

import { BoundedMap } from '@/lib/bounded-map';
import { getConfig } from '@/lib/config';
import { isUrlSafeDeep } from '@/lib/ssrf-protection';
import { getRandomUserAgent } from '@/lib/user-agent';

const DEFAULT_USER_AGENT = 'AptvPlayer/1.4.10';

// CDN 域名级策略缓存（进程级别，跨请求有效，最多500条自动淘汰）
const BLOCK_TTL_MS = 300000; // 熔断 5 分钟后放一个探测请求
const BLOCK_FAIL_THRESHOLD = 3; // 连续失败 3 次才熔断：单个 404（删片）不误伤整站
const cdnStrategy = new BoundedMap<
  string,
  {
    best: 'direct' | 'ua_rotate' | 'proxy' | 'blocked';
    lastOk: number;
    lastFail: number;
    consecFails: number;
  }
>(500);

function getCdnDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function reportCdnResult(
  domain: string,
  ok: boolean,
  via: 'direct' | 'ua_rotate' | 'proxy',
) {
  const entry = cdnStrategy.get(domain);
  if (!entry) {
    cdnStrategy.set(domain, {
      best: ok ? via : 'direct',
      lastOk: ok ? Date.now() : 0,
      lastFail: ok ? 0 : Date.now(),
      consecFails: ok ? 0 : 1,
    });
    return;
  }
  if (ok) {
    // 保留更优策略：direct > ua_rotate > proxy
    const order = ['direct', 'ua_rotate', 'proxy'];
    if (order.indexOf(via) < order.indexOf(entry.best)) {
      entry.best = via;
    }
    entry.lastOk = Date.now();
    entry.consecFails = 0;
    return;
  }
  // 失败：连续计数，达阈值才熔断（单次 404/抖动不误伤）
  entry.lastFail = Date.now();
  entry.consecFails++;
  if (entry.consecFails >= BLOCK_FAIL_THRESHOLD) {
    entry.best = 'blocked';
  }
}

function getCdnStrategy(
  domain: string,
): 'direct' | 'ua_rotate' | 'proxy' | 'blocked' {
  const entry = cdnStrategy.get(domain);
  if (!entry) return 'direct';
  if (entry.best === 'blocked') {
    // 熔断窗内短路；窗口过后放行一次探测（direct），成败重新学习——
    // 旧代码此处直接返回 entry.best，blocked 后永不恢复（需重启）
    return Date.now() - entry.lastFail < BLOCK_TTL_MS ? 'blocked' : 'direct';
  }
  return entry.best;
}

export async function getSourceUserAgent(
  source: string | null,
): Promise<string> {
  if (!source) return DEFAULT_USER_AGENT;
  try {
    const config = await getConfig();
    const liveSource = config.LiveConfig?.find((s: any) => s.key === source);
    return liveSource?.ua || DEFAULT_USER_AGENT;
  } catch {
    return DEFAULT_USER_AGENT;
  }
}

function buildHeaders(
  base: Record<string, string> | Headers | undefined,
  ua: string,
  extra?: Record<string, string>,
): Headers {
  const h = new Headers(base);
  h.set('User-Agent', ua);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (!h.has(k)) h.set(k, v);
    }
  }
  return h;
}

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
  'AptvPlayer/1.4.10',
];

export async function fetchWithRetry(
  url: string,
  init: Record<string, any>,
  originalUA: string,
): Promise<Response> {
  const domain = getCdnDomain(url);
  const strategy = domain ? getCdnStrategy(domain) : 'direct';

  // 已知被封的 CDN 直接跳过
  if (strategy === 'blocked') {
    return new Response('CDN blocked (cached)', { status: 403 });
  }

  const doFetch = async (headers: Headers) => {
    const resp = await fetch(url, { ...init, headers });
    if (resp.ok && domain) reportCdnResult(domain, true, strategy);
    return resp;
  };

  // 根据策略选择尝试顺序
  const attempts: {
    ua: string;
    via: 'direct' | 'ua_rotate' | 'proxy';
    setup?: (h: Headers) => void;
  }[] = [];

  if (strategy === 'proxy') {
    // 已知需要代理的 CDN：直接走 VideoProxy
    attempts.push({ ua: getRandomUserAgent(), via: 'proxy' });
  } else if (strategy === 'ua_rotate') {
    // 已知需要换 UA 的 CDN：先换 UA
    attempts.push({
      ua: UA_POOL[Math.floor(Math.random() * UA_POOL.length)],
      via: 'ua_rotate',
      setup: (h) => {
        if (h.has('Referer') && h.has('Origin')) return;
        try {
          const p = new URL(url);
          h.set('Referer', p.origin + '/');
          h.set('Origin', p.origin);
        } catch {}
      },
    });
    attempts.push({ ua: DEFAULT_USER_AGENT, via: 'direct' });
  } else {
    // 新 CDN：始终先发 Referer+Origin（防盗链绕过），失败后换 UA，再失败走 Proxy
    attempts.push({
      ua: originalUA,
      via: 'direct',
      setup: (h) => {
        if (h.has('Referer') && h.has('Origin')) return;
        try {
          const p = new URL(url);
          h.set('Referer', p.origin + '/');
          h.set('Origin', p.origin);
        } catch {}
      },
    });
    attempts.push({
      ua: UA_POOL[Math.floor(Math.random() * UA_POOL.length)],
      via: 'ua_rotate',
      setup: (h) => {
        if (h.has('Referer') && h.has('Origin')) return;
        try {
          const p = new URL(url);
          h.set('Referer', p.origin + '/');
          h.set('Origin', p.origin);
        } catch {}
      },
    });
    attempts.push({ ua: getRandomUserAgent(), via: 'proxy' });
  }

  // 是否见过上游真实 403（地域封锁/防盗链），用于最终状态码：
  // 纯网络错误（DNS/超时/Abort）不应伪装成 403，避免调用方做无意义的 403 重试
  let sawUpstream403 = false;

  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    try {
      const headers = buildHeaders(init.headers, a.ua);
      if (a.setup) a.setup(headers);

      let response: Response | null = null;

      if (a.via === 'proxy') {
        // 走 VideoProxy
        const config = await getConfig();
        const proxyCfg = config.VideoProxyConfig;
        if (proxyCfg?.enabled && proxyCfg.proxyUrl) {
          const proxyBase = proxyCfg.proxyUrl.replace(/\/$/, '');
          response = await fetch(
            `${proxyBase}/p/video?url=${encodeURIComponent(url)}`,
            {
              signal: AbortSignal.timeout(15000),
            },
          );
          if (response.ok) {
            if (domain) reportCdnResult(domain, true, 'proxy');
            return response;
          }
        }
        continue;
      }

      response = await fetch(url, { ...init, headers });

      if (response.ok) {
        if (domain) reportCdnResult(domain, true, a.via);
        // 落地校验：fetch 自动跟随 302，落地到内网即拦截并丢弃 body
        // （保留 follow 行为，合法 CDN 的 302 跳转不受影响）
        if (response.url && !(await isUrlSafeDeep(response.url))) {
          try {
            response.body?.cancel();
          } catch {}
          if (domain) reportCdnResult(domain, false, a.via);
          return new Response('Upstream redirect blocked', { status: 403 });
        }
        return response;
      }

      if (response.status === 403) {
        sawUpstream403 = true;
        // Capture Set-Cookie from CDN (e.g., cf_clearance) and retry with cookie
        const setCookie = response.headers.get('set-cookie');
        if (setCookie && domain) {
          const cookieKey = `cdn_cookie:${domain}`;
          if (!(globalThis as any).__cdnCookies)
            (globalThis as any).__cdnCookies = new Map();
          const jar = (globalThis as any).__cdnCookies;
          // Parse cookies from Set-Cookie header
          const cookies = setCookie
            .split(',')
            .map((c: string) => c.trim().split(';')[0])
            .filter(Boolean);
          const existing = jar.get(cookieKey) || [];
          jar.set(cookieKey, [...existing, ...cookies].slice(-10)); // Keep last 10

          // Retry with cookie
          try {
            const cookieHeaders = new Headers(headers);
            cookieHeaders.set('Cookie', jar.get(cookieKey).join('; '));
            const retryResp = await fetch(url, {
              ...init,
              headers: cookieHeaders,
            });
            if (retryResp.ok) {
              if (domain) reportCdnResult(domain, true, a.via);
              if (retryResp.url && !(await isUrlSafeDeep(retryResp.url))) {
                try {
                  retryResp.body?.cancel();
                } catch {}
                if (domain) reportCdnResult(domain, false, a.via);
                return new Response('Upstream redirect blocked', {
                  status: 403,
                });
              }
              return retryResp;
            }
          } catch (error) {
            /* URL parse or fetch error — safe to skip */
          }
        }

        // Continue to next attempt
        try {
          response.body?.cancel();
        } catch (error) {
          /* URL parse or fetch error — safe to skip */
        }
        continue;
      }

      if (response.status !== 403) {
        // 非 403 错误（如 404/500）不重试；同样做落地校验后直接透传
        if (response.url && !(await isUrlSafeDeep(response.url))) {
          try {
            response.body?.cancel();
          } catch {}
          if (domain) reportCdnResult(domain, false, a.via);
          return new Response('Upstream redirect blocked', { status: 403 });
        }
        // 非 ok 计入连续失败（304 除外）：3 次即熔断该 host 5 分钟，
        // 重复探测死源时直接短路，客户端秒级判定死亡换源
        if (domain && !response.ok && response.status !== 304) {
          reportCdnResult(domain, false, a.via);
        }
        return response;
      }

      try {
        response.body?.cancel();
      } catch {}
    } catch {}
  }

  if (domain) reportCdnResult(domain, false, 'direct');
  // 见过真实 403 才返回 403（调用方会做去头/地域重试）；
  // 纯网络错误返回 502，避免无意义的重试放大
  return sawUpstream403
    ? new Response('All retry attempts failed', { status: 403 })
    : new Response('Upstream unreachable', { status: 502 });
}
