/**
 * Douban Multi-Provider Proxy
 * Based on DecoTV/LunaTV architecture
 * Auto-fallback with latency-based ranking and negative caching
 */

export type DoubanDataProvider =
  | 'direct'
  | 'cmliussss-cdn-ali'
  | 'cmliussss-cdn-tencent'
  | 'cors-proxy-zwei'
  | 'custom';

interface ProviderStats {
  durationMs: number;
  successCount: number;
  failCount: number;
}

// Provider health tracking
const providerStats = new Map<DoubanDataProvider, ProviderStats>();
const negativeCache = new Map<DoubanDataProvider, number>();
const NEGATIVE_CACHE_TTL_MS = 90000; // 90 seconds

// Custom proxy URL (configurable)
let customProxyUrl = '';

export function setCustomProxyUrl(url: string) {
  customProxyUrl = url;
}

function isProviderTemporarilyBad(provider: DoubanDataProvider): boolean {
  const blockedUntil = negativeCache.get(provider);
  if (blockedUntil && Date.now() < blockedUntil) {
    return true;
  }
  if (blockedUntil) {
    negativeCache.delete(provider);
  }
  return false;
}

function recordProviderSuccess(
  provider: DoubanDataProvider,
  durationMs: number,
) {
  const stats = providerStats.get(provider) || {
    durationMs: 0,
    successCount: 0,
    failCount: 0,
  };
  stats.durationMs =
    (stats.durationMs * stats.successCount + durationMs) /
    (stats.successCount + 1);
  stats.successCount++;
  providerStats.set(provider, stats);
}

function recordProviderFailure(provider: DoubanDataProvider) {
  const stats = providerStats.get(provider) || {
    durationMs: 0,
    successCount: 0,
    failCount: 0,
  };
  stats.failCount++;
  providerStats.set(provider, stats);
  negativeCache.set(provider, Date.now() + NEGATIVE_CACHE_TTL_MS);
}

function getDefaultProviders(): DoubanDataProvider[] {
  const providers: DoubanDataProvider[] = [];
  if (customProxyUrl) providers.push('custom');
  providers.push(
    'cmliussss-cdn-ali',
    'direct',
    'cmliussss-cdn-tencent',
    'cors-proxy-zwei',
  );
  return providers;
}

function sortProviders(providers: DoubanDataProvider[]): DoubanDataProvider[] {
  const available = providers.filter((p) => !isProviderTemporarilyBad(p));
  const fallback = available.length > 0 ? available : providers;
  return [...fallback].sort((a, b) => {
    const aStats = providerStats.get(a);
    const bStats = providerStats.get(b);
    if (aStats && bStats) return aStats.durationMs - bStats.durationMs;
    if (aStats) return -1;
    if (bStats) return 1;
    return providers.indexOf(a) - providers.indexOf(b);
  });
}

function rewriteHost(url: string, provider: DoubanDataProvider): string {
  const parsed = new URL(url);
  if (provider === 'cmliussss-cdn-tencent') {
    if (parsed.hostname === 'm.douban.com')
      parsed.hostname = 'm.douban.cmliussss.net';
    else if (parsed.hostname === 'movie.douban.com')
      parsed.hostname = 'movie.douban.cmliussss.net';
    else if (parsed.hostname.endsWith('doubanio.com'))
      parsed.hostname = parsed.hostname.replace(
        'doubanio.com',
        'doubanio.cmliussss.net',
      );
  }
  if (provider === 'cmliussss-cdn-ali') {
    if (parsed.hostname === 'm.douban.com')
      parsed.hostname = 'm.douban.cmliussss.com';
    else if (parsed.hostname === 'movie.douban.com')
      parsed.hostname = 'movie.douban.cmliussss.com';
    else if (parsed.hostname.endsWith('doubanio.com'))
      parsed.hostname = parsed.hostname.replace(
        'doubanio.com',
        'doubanio.cmliussss.com',
      );
  }
  return parsed.toString();
}

function buildFetchUrl(url: string, provider: DoubanDataProvider): string {
  if (provider === 'cors-proxy-zwei') {
    return `https://ciao-cors.is-an.org/${url}`;
  }
  if (provider === 'custom' && customProxyUrl) {
    return customProxyUrl.replace('{url}', encodeURIComponent(url));
  }
  return rewriteHost(url, provider);
}

const DOUBAN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://movie.douban.com/',
  Origin: 'https://movie.douban.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Sec-Ch-Ua':
    '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

function isAntiSpider(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('sec.douban.com') ||
    lower.includes('检测到有异常请求') ||
    lower.includes('账号登录')
  );
}

function isHtmlResponse(text: string): boolean {
  const trimmed = text.trimStart().slice(0, 256).toLowerCase();
  return (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<title>')
  );
}

/**
 * Fetch Douban data with multi-provider fallback
 */
export async function fetchDoubanWithProxy<T>(
  url: string,
  timeout: number = 8000,
): Promise<{ data: T; provider: DoubanDataProvider; durationMs: number }> {
  const providers = sortProviders(getDefaultProviders());
  let lastError: string = '';

  for (const provider of providers) {
    const fetchUrl = buildFetchUrl(url, provider);
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: DOUBAN_HEADERS,
      });
      clearTimeout(timer);

      const durationMs = Date.now() - startTime;
      const text = await response.text();

      // Check for anti-spider
      if (isAntiSpider(text) || isHtmlResponse(text)) {
        recordProviderFailure(provider);
        lastError = `${provider}: anti-spider detected`;
        continue;
      }

      // Try to parse JSON
      try {
        const data = JSON.parse(text) as T;
        recordProviderSuccess(provider, durationMs);
        return { data, provider, durationMs };
      } catch {
        recordProviderFailure(provider);
        lastError = `${provider}: invalid JSON`;
        continue;
      }
    } catch (e: any) {
      const durationMs = Date.now() - startTime;
      recordProviderFailure(provider);
      lastError = `${provider}: ${e.message}`;
      continue;
    }
  }

  throw new Error(`All providers failed: ${lastError}`);
}

/**
 * Fetch Douban image with provider fallback
 */
export function getDoubanImageUrl(
  originalUrl: string,
  provider: DoubanDataProvider = 'direct',
): string {
  if (!originalUrl) return '';
  // Ensure HTTPS
  const url = originalUrl.replace(/^http:/, 'https:');
  return rewriteHost(url, provider);
}

/**
 * Get image provider candidates for auto-fallback
 */
export function getImageProviderCandidates(originalUrl: string): string[] {
  const url = originalUrl.replace(/^http:/, 'https:');
  const candidates: string[] = [];

  // Try known CDN mirrors first
  if (url.includes('doubanio.com')) {
    candidates.push(url.replace('doubanio.com', 'doubanio.cmliussss.com'));
    candidates.push(url.replace('doubanio.com', 'doubanio.cmliussss.net'));
  }

  // Then try img3
  if (url.includes('img.doubanio.com')) {
    candidates.push(url.replace('img.doubanio.com', 'img3.doubanio.com'));
  }

  // Then try server proxy
  candidates.push(`/api/image-proxy?url=${encodeURIComponent(url)}`);

  // Finally direct
  candidates.push(url);

  return candidates;
}
