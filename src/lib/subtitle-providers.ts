// 字幕源抽象层：可扩展预设字幕源，统一搜索/下载接口
// 当前内置：subhd（中文，普通 HTTP）、OpenSubtitles（英文兜底）
// 设计：Provider Registry + 结果缓存 + 统一错误处理

export interface SubtitleSearchResult {
  title: string;
  language?: string;
  format?: string;
  fileId?: number;
  downloadUrl?: string;
  provider: string;
  pageUrl?: string;
}

export interface SubtitleContent {
  content: string;
  format: string;
  title: string;
  language?: string;
}

interface Provider {
  id: string;
  search(title: string, year?: string): Promise<SubtitleSearchResult[]>;
  resolve?(result: SubtitleSearchResult): Promise<SubtitleContent | null>;
  downloadUrl?(result: SubtitleSearchResult): Promise<string | null>;
}

// ── 通用 ──────────────────────────────────────────────────────────
const TIMEOUT = { search: 15000, download: 15000, page: 15000 } as const;
const CACHE_TTL_MS = 10 * 60 * 1000; // 搜索结果缓存 10 分钟

class TtlCache<K, V> {
  private map = new Map<K, { v: V; exp: number }>();
  get(k: K): V | undefined {
    const e = this.map.get(k);
    if (!e) return undefined;
    if (Date.now() > e.exp) {
      this.map.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: K, v: V, ttl = CACHE_TTL_MS) {
    this.map.set(k, { v, exp: Date.now() + ttl });
    if (this.map.size > 200) {
      const first = this.map.keys().next().value as K;
      this.map.delete(first);
    }
  }
}

const searchCache = new TtlCache<string, SubtitleSearchResult[]>();

// ── subhd：中文字幕源（镜像回退，无需 Puppeteer） ─────────────────
const SUBHD_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SUBHD_BASES = [
  'https://subhd.tv',
  'https://subhd.me',
  'https://subhdtw.com',
] as const;

async function subhdFetch(
  url: string,
  cookie?: string,
): Promise<{ text: string; setCookie: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': SUBHD_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT.page),
  });
  if (!res.ok) throw new Error(`subhd fetch ${res.status}`);
  return {
    text: await res.text(),
    setCookie: (res.headers.get('set-cookie') || '').split(';')[0],
  };
}

async function subhdApiFetch(
  url: string,
  cookie: string,
  referer: string,
): Promise<{ json: any }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': SUBHD_UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT.page),
  });
  if (!res.ok) throw new Error(`subhd api ${res.status}`);
  const text = await res.text();
  try {
    return { json: JSON.parse(text) };
  } catch {
    return { json: { raw: text } };
  }
}

async function searchSubhdSubtitle(
  title: string,
): Promise<SubtitleSearchResult[]> {
  let html = '';
  for (const base of SUBHD_BASES) {
    try {
      const r = await subhdFetch(`${base}/search/${encodeURIComponent(title)}`);
      if (r.text.length > 500) {
        html = r.text;
        break;
      }
    } catch {
      continue;
    }
  }
  if (!html) return [];

  const results: SubtitleSearchResult[] = [];
  const blockRe =
    /class="bg-white shadow-sm rounded-3 mb-4"[\s\S]*?(?=class="bg-white shadow-sm rounded-3 mb-4"|$)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[0];
    const att = block.match(/href='(\/a\/[A-Za-z0-9]+)'/);
    if (!att) continue;
    const token = att[1].replace('/a/', '');
    const t1 = block.match(/link-dark align-middle"[^>]*>([^<]+)/)?.[1]?.trim();
    const t2 = block
      .match(/view-text[^>]*>[\s\S]*?href='\/a\/[^']+'[^>]*>([^<]+)/)?.[1]
      ?.trim();
    const lang = block
      .match(/<span class="p-1 fw-bold">([^<]+)<\/span>/)?.[1]
      ?.trim();
    const fmt = block
      .match(/<span class="p-1 text-secondary">([^<]+)<\/span>/)?.[1]
      ?.trim()
      .toLowerCase();

    results.push({
      title: t1 || t2 || title,
      language: lang || 'zh',
      format: fmt && ['srt', 'ass', 'vtt'].includes(fmt) ? fmt : 'srt',
      provider: 'subhd',
      fileId: -1,
      pageUrl: `${SUBHD_BASES[0]}/a/${token}`,
    });
    if (results.length >= 20) break;
  }
  return results;
}

async function resolveSubhdSubtitleContent(
  pageUrl: string,
): Promise<SubtitleContent | null> {
  const token =
    pageUrl.split('/a/')[1]?.split('?')[0] || pageUrl.split('/').pop()!;
  let attach: { text: string; setCookie: string } | null = null;
  let attachUrl = pageUrl;

  for (const base of SUBHD_BASES) {
    try {
      const r = await subhdFetch(`${base}/a/${token}`);
      if (r.text.includes('data-preview-url')) {
        attach = r;
        attachUrl = `${base}/a/${token}`;
        break;
      }
    } catch {
      continue;
    }
  }
  if (!attach) return null;

  const previewPath = attach.text.match(/data-preview-url="([^"]+)"/)?.[1];
  if (!previewPath) return null;

  const baseHost = new URL(attachUrl).origin;
  const apiRes = await subhdApiFetch(
    `${baseHost}${previewPath}?file=0`,
    attach.setCookie,
    attachUrl,
  );
  const file = apiRes.json?.file;
  if (!file || typeof file.content !== 'string' || !file.content) return null;

  const isAss = (file.filename || '').toLowerCase().endsWith('.ass');
  return {
    content: file.content,
    format: isAss ? 'ass' : 'srt',
    title: file.filename || '',
    language: (file.filename || '').includes('繁') ? 'zh-TW' : 'zh-CN',
  };
}

const subhdProvider: Provider = {
  id: 'subhd',
  search: searchSubhdSubtitle,
  resolve: (r) => resolveSubhdSubtitleContent(r.pageUrl || ''),
};

// ── OpenSubtitles ───────────────────────────────────────────────
const OS_BASE = 'https://api.opensubtitles.com/api/v1';

async function osLogin(): Promise<string | null> {
  const u = process.env.OPENSUBTITLES_USERNAME;
  const p = process.env.OPENSUBTITLES_PASSWORD;
  if (!u || !p) return null;
  try {
    const res = await fetch(`${OS_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.OPENSUBTITLES_API_KEY || '',
      },
      body: JSON.stringify({ username: u, password: p }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j.token === 'string' ? j.token : null;
  } catch {
    return null;
  }
}

async function searchOpenSubtitles(
  title: string,
  year?: string,
): Promise<SubtitleSearchResult[]> {
  const key = process.env.OPENSUBTITLES_API_KEY;
  if (!key) return [];
  const qs = new URLSearchParams({
    query: title,
    languages: 'chi,zho,zht,zh,cmn,yue',
    ...(year ? { year } : {}),
  });
  try {
    const res = await fetch(`${OS_BASE}/subtitles?${qs}`, {
      headers: { 'Api-Key': key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT.search),
    });
    if (!res.ok) return [];
    const j = await res.json();
    const items: any[] = Array.isArray(j.data) ? j.data : [];
    return items.map((it) => ({
      title: it.attributes?.release || title,
      language: it.attributes?.language || '',
      format: 'srt',
      fileId: it.id,
      provider: 'opensubtitles',
      pageUrl: `https://www.opensubtitles.com/en/subtitles/${it.id}`,
    }));
  } catch {
    return [];
  }
}

async function downloadOpenSubtitles(fileId: number): Promise<string | null> {
  const key = process.env.OPENSUBTITLES_API_KEY;
  if (!key) return null;
  const token = await osLogin();
  try {
    const res = await fetch(`${OS_BASE}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': key,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ file_id: fileId }),
      signal: AbortSignal.timeout(TIMEOUT.download),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j.link === 'string' ? j.link : null;
  } catch {
    return null;
  }
}

const osProvider: Provider = {
  id: 'opensubtitles',
  search: searchOpenSubtitles,
  downloadUrl: (r) =>
    typeof r.fileId === 'number' ? downloadOpenSubtitles(r.fileId) : null,
};

// ── Registry & Public API ───────────────────────────────────────
const providers: Provider[] = [subhdProvider, osProvider];

export async function searchSubtitles(
  title: string,
  year?: string,
): Promise<SubtitleSearchResult[]> {
  const cacheKey = `${title}:${year || ''}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const settled = await Promise.allSettled(
    providers.map((p) =>
      p
        .search(title, year)
        .catch(() => [] as SubtitleSearchResult[])
        .then((r) => ({ provider: p.id, results: r })),
    ),
  );

  const merged: SubtitleSearchResult[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value.results.length) {
      merged.push(...s.value.results);
    }
  }
  if (merged.length) searchCache.set(cacheKey, merged);
  return merged;
}

export async function resolveSubtitleDownloadUrl(
  result: SubtitleSearchResult,
): Promise<string | null> {
  if (result.downloadUrl) return result.downloadUrl;
  const p = providers.find((x) => x.id === result.provider);
  if (p?.downloadUrl && typeof result.fileId === 'number') {
    return p.downloadUrl(result);
  }
  return null;
}

export async function resolveSubtitleContent(
  result: SubtitleSearchResult,
): Promise<SubtitleContent | null> {
  const p = providers.find((x) => x.id === result.provider);
  if (p?.resolve) return p.resolve(result);
  return null;
}
