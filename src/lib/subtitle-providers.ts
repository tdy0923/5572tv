// 字幕源抽象层：支持多个预设字幕源，统一搜索/下载接口
// 当前内置：OpenSubtitles（官方 API，需配置 OPENSUBTITLES_API_KEY）
// 后续可扩展：subhd / zimuku 等（需反爬策略，暂缓）

export interface SubtitleSearchResult {
  title: string;
  language?: string;
  format?: string;
  fileId?: number;
  downloadUrl?: string; // 可直接加载的字幕文件 URL
  provider: string;
  pageUrl?: string; // 字幕源页面（供跳转）
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

// 统一搜索入口：依次尝试各预设字幕源
export async function searchSubtitles(
  title: string,
  year?: string,
): Promise<SubtitleSearchResult[]> {
  const results: SubtitleSearchResult[] = [];
  // OpenSubtitles
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
