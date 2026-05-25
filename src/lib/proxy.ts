import { getConfig } from '@/lib/config';
import { getRandomUserAgent } from '@/lib/user-agent';

const DEFAULT_USER_AGENT = 'AptvPlayer/1.4.10';

// CDN 域名级策略缓存（进程级别，跨请求有效）
const cdnStrategy = new Map<
  string,
  {
    best: 'direct' | 'ua_rotate' | 'proxy' | 'blocked';
    lastOk: number;
  }
>();

export function getCdnDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function reportCdnResult(
  domain: string,
  ok: boolean,
  via: 'direct' | 'ua_rotate' | 'proxy',
) {
  const entry = cdnStrategy.get(domain);
  if (!entry) {
    cdnStrategy.set(domain, {
      best: ok ? via : 'blocked',
      lastOk: ok ? Date.now() : 0,
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
  }
}

export function getCdnStrategy(
  domain: string,
): 'direct' | 'ua_rotate' | 'proxy' | 'blocked' {
  const entry = cdnStrategy.get(domain);
  if (!entry) return 'direct';
  // 超过 5 分钟可重新尝试
  if (entry.best === 'blocked' && Date.now() - entry.lastOk < 300000)
    return 'blocked';
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
        try {
          const p = new URL(url);
          h.set('Referer', p.origin + '/');
          h.set('Origin', p.origin);
        } catch {}
      },
    });
    attempts.push({ ua: DEFAULT_USER_AGENT, via: 'direct' });
  } else {
    // 新 CDN：尝试默认 UA，失败后换 UA+Referer，再失败走 Proxy
    attempts.push({ ua: originalUA, via: 'direct' });
    attempts.push({
      ua: UA_POOL[Math.floor(Math.random() * UA_POOL.length)],
      via: 'ua_rotate',
      setup: (h) => {
        try {
          const p = new URL(url);
          h.set('Referer', p.origin + '/');
          h.set('Origin', p.origin);
        } catch {}
      },
    });
    attempts.push({ ua: getRandomUserAgent(), via: 'proxy' });
  }

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
        return response;
      }

      if (response.status !== 403) {
        // 非 403 错误（如 404/500）不重试
        return response;
      }

      try {
        response.body?.cancel();
      } catch {}
    } catch {}
  }

  if (domain) reportCdnResult(domain, false, 'direct');
  return new Response('All retry attempts failed', { status: 403 });
}
