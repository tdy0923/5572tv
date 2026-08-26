// 字幕源抽象层：支持多个预设字幕源，统一搜索/下载接口
// 内置：
//  - OpenSubtitles（官方 API，需配置 OPENSUBTITLES_API_KEY，中文覆盖较弱）
//  - subhd（中文源，普通 HTTP + 浏览器 UA/cookie 即可，无依赖）

export interface SubtitleSearchResult {
  title: string;
  language?: string;
  format?: string;
  fileId?: number;
  downloadUrl?: string; // 可直接加载的字幕文件 URL
  provider: string;
  pageUrl?: string; // 字幕源页面（供跳转）
}

export interface SubtitleContent {
  content: string;
  format: string; // srt / ass / vtt
  title: string;
  language?: string;
}

const SUBHD_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SUBHD_BASES = [
  'https://subhd.tv',
  'https://subhd.me',
  'https://subhdtw.com',
];

// ──────────────────────────────── subhd ────────────────────────────────
// 中文字幕源。支持多镜像回退（subhd.tv / subhd.me / subhdtw.com），自动容错。
// 流程（全程普通 HTTP，无需 Puppeteer/Chromium）：
//   1. /search/{title} → 字幕附件链接 /a/{token}（含 简体/繁体 + SRT/ASS 标记）
//   2. /a/{token}      → 提取 data-preview-url = /api/sub/preview/{token}
//   3. 预览 API（带 cookie + Referer）→ 字幕内容

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
    signal: AbortSignal.timeout(15000),
  });
  const setCookie = (res.headers.get('set-cookie') || '').split(';')[0];
  return { text: await res.text(), setCookie };
}

async function subhdApiFetch(
  url: string,
  cookie: string,
  referer: string,
): Promise<{ json: any; setCookie: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': SUBHD_UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const setCookie = (res.headers.get('set-cookie') || '').split(';')[0];
  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { json, setCookie };
}

// 搜索 subhd：搜索结果页直接含字幕附件链接 /a/{token}（含语言/格式标记）
async function searchSubhdSubtitle(
  title: string,
): Promise<SubtitleSearchResult[]> {
  try {
    // 多镜像回退：任一镜像返回结果即用
    // 多镜像回退：任一镜像返回内容即用
    let text = '';
    for (const base of SUBHD_BASES) {
      try {
        const r = await subhdFetch(
          `${base}/search/${encodeURIComponent(title)}`,
        );
        if (r.text && r.text.length > 500) {
          text = r.text;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!text) return [];

    const results: SubtitleSearchResult[] = [];
    // 每个搜索结果是一个 .bg-white.shadow-sm.rounded-3 块，含 /a/ 附件链接、标题、语言、格式
    const blockRe =
      /class="bg-white shadow-sm rounded-3 mb-4"[\s\S]*?(?=class="bg-white shadow-sm rounded-3 mb-4"|$)/g;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(text)) !== null) {
      const block = bm[0];
      const attMatch = block.match(/href='(\/a\/[A-Za-z0-9]+)'/);
      if (!attMatch) continue;
      const token = attMatch[1].replace('/a/', '');
      // 标题：link-dark align-middle 链接文本
      const titleMatch = block.match(/link-dark align-middle"[^>]*>([^<]+)/);
      const descMatch = block.match(
        /view-text[^>]*>[\s\S]*?href='\/a\/[^']+'[^>]*>([^<]+)/,
      );
      // 语言：简体 / 繁体 / 中文
      const langMatch = block.match(
        /<span class="p-1 fw-bold">([^<]+)<\/span>/,
      );
      // 格式：SRT / ASS / VTT
      const fmtMatch = block.match(
        /<span class="p-1 text-secondary">([^<]+)<\/span>/,
      );

      const language = langMatch ? langMatch[1].trim() : undefined;
      const format = fmtMatch ? fmtMatch[1].trim().toLowerCase() : undefined;

      results.push({
        title: titleMatch?.[1]?.trim() || descMatch?.[1]?.trim() || title,
        language: language || (title ? 'zh' : undefined),
        format:
          format && ['srt', 'ass', 'vtt'].includes(format) ? format : 'srt',
        provider: 'subhd',
        fileId: -1, // 用 token 代替
        pageUrl: `${SUBHD_BASES[0]}/a/${token}`,
      });
      if (results.length >= 20) break;
    }

    return results;
  } catch {
    return [];
  }
}

// 从 subhd 附件页获取字幕内容
async function resolveSubhdSubtitleContent(
  pageUrl: string,
): Promise<SubtitleContent | null> {
  try {
    // pageUrl 形如 https://subhd.tv/a/{token}；提取 token 以便在镜像间回退
    const token = pageUrl.split('/a/')[1] || pageUrl.split('/').pop();
    let attach: { text: string; setCookie: string } | null = null;
    for (const base of SUBHD_BASES) {
      try {
        const r = await subhdFetch(`${base}/a/${token}`);
        if (r.text && r.text.includes('data-preview-url')) {
          attach = r;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!attach) return null;
    const attachUrl = pageUrl.includes('/a/')
      ? `https://subhd.tv/a/${token}`
      : pageUrl;
    const prevMatch = attach.text.match(/data-preview-url="([^"]+)"/);
    if (!prevMatch) return null;
    const previewPath = prevMatch[1];

    // 预览 API → 字幕内容（带 cookie + Referer）
    const apiRes = await subhdApiFetch(
      `https://subhd.tv${previewPath}?file=0`,
      attach.setCookie,
      attachUrl,
    );
    const file = apiRes.json?.file;
    if (!file || typeof file.content !== 'string' || !file.content) return null;

    const format = (file.filename || '').toLowerCase().endsWith('.ass')
      ? 'ass'
      : 'srt';

    const desc = file.filename || '';
    return {
      content: file.content,
      format,
      title: desc,
      language: desc.includes('繁') ? 'zh-TW' : 'zh-CN',
    };
  } catch {
    return null;
  }
}

const OPENSUBTITLES_BASE = 'https://api.opensubtitles.com/api/v1';

async function openSubtitlesLogin(): Promise<string | null> {
  const username = process.env.OPENSUBTITLES_USERNAME;
  const password = process.env.OPENSUBTITLES_PASSWORD;
  if (!username || !password) return null;
  try {
    const res = await fetch(`${OPENSUBTITLES_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.OPENSUBTITLES_API_KEY || '',
      },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.token === 'string' ? data.token : null;
  } catch {
    return null;
  }
}

// 从 OpenSubtitles 搜索中文字幕
async function searchOpenSubtitles(
  title: string,
  year?: string,
): Promise<SubtitleSearchResult[]> {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams();
  params.set('query', title);
  params.set('languages', 'chi,zho,zht,zh,cmn,yue');
  if (year) params.set('year', year);

  try {
    const res = await fetch(
      `${OPENSUBTITLES_BASE}/subtitles?${params.toString()}`,
      {
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) return [];

    const data = await res.json();
    const items: any[] = Array.isArray(data.data) ? data.data : [];

    const results: SubtitleSearchResult[] = [];
    for (const item of items) {
      const attr = item.attributes;
      if (!attr) continue;
      const fileId = item.id;
      const language = attr.language || attr.language_original || '';
      const release = attr.release || '';
      const files = Array.isArray(attr.files) ? attr.files : [];
      results.push({
        title: release || title,
        language,
        format: 'srt',
        fileId,
        provider: 'opensubtitles',
        pageUrl: `https://www.opensubtitles.com/en/subtitles/${fileId}`,
      });
      // 每个条目可能有多个文件，取第一个
      void files;
    }
    return results;
  } catch {
    return [];
  }
}

// 获取 OpenSubtitles 字幕文件下载链接（需登录 token）
async function getOpenSubtitlesDownloadUrl(
  fileId: number,
): Promise<string | null> {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) return null;
  const token = await openSubtitlesLogin();
  try {
    const res = await fetch(`${OPENSUBTITLES_BASE}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ file_id: fileId }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.link === 'string' ? data.link : null;
  } catch {
    return null;
  }
}

// 统一搜索入口：subhd（中文源）→ OpenSubtitles（英文兜底）
export async function searchSubtitles(
  title: string,
  year?: string,
): Promise<SubtitleSearchResult[]> {
  const results: SubtitleSearchResult[] = [];
  // subhd 中文源
  const sh = await searchSubhdSubtitle(title);
  results.push(...sh);
  // OpenSubtitles 英文源
  const os = await searchOpenSubtitles(title, year);
  results.push(...os);
  return results;
}

// 统一下载入口：为结果补充可直接加载的 downloadUrl
export async function resolveSubtitleDownloadUrl(
  result: SubtitleSearchResult,
): Promise<string | null> {
  if (result.downloadUrl) return result.downloadUrl;
  if (
    result.provider === 'opensubtitles' &&
    typeof result.fileId === 'number'
  ) {
    return await getOpenSubtitlesDownloadUrl(result.fileId);
  }
  return null;
}

// 解析字幕内容（用于 subhd 等多步获取的内容源）
export async function resolveSubtitleContent(
  result: SubtitleSearchResult,
): Promise<SubtitleContent | null> {
  if (result.provider === 'subhd' && result.pageUrl) {
    return await resolveSubhdSubtitleContent(result.pageUrl);
  }
  return null;
}
