import { getConfig } from '@/lib/config';
import { getRandomUserAgent } from '@/lib/user-agent';

const DEFAULT_USER_AGENT = 'AptvPlayer/1.4.10';

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

export async function fetchWithRetry(
  url: string,
  init: Record<string, any>,
  originalUA: string,
): Promise<Response> {
  const firstHeaders = buildHeaders(init.headers, originalUA);

  const response = await fetch(url, { ...init, headers: firstHeaders });

  if (response.ok || response.status !== 403) {
    return response;
  }

  try {
    response.body?.cancel();
  } catch {}

  const retryHeaders = buildHeaders(init.headers, getRandomUserAgent(), {
    Referer: '',
    Origin: '',
  });
  try {
    const parsed = new URL(url);
    retryHeaders.set('Referer', parsed.origin + '/');
    retryHeaders.set('Origin', parsed.origin);
  } catch {}

  const retryResponse = await fetch(url, { ...init, headers: retryHeaders });
  if (retryResponse.ok || retryResponse.status !== 403) {
    return retryResponse;
  }

  try {
    retryResponse.body?.cancel();
  } catch {}

  try {
    const config = await getConfig();
    const proxyCfg = config.VideoProxyConfig;
    if (proxyCfg?.enabled && proxyCfg.proxyUrl) {
      const proxyBase = proxyCfg.proxyUrl.replace(/\/$/, '');
      const proxyResp = await fetch(
        `${proxyBase}/p/video?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (proxyResp.ok) return proxyResp;
    }
  } catch {}

  return retryResponse;
}
