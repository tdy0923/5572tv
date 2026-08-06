import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 短剧多源整合配置
export interface ShortDramaSource {
  name: string;
  api: string;
  type: 'cms'; // CMS 采集站格式
  categories: { id: number; name: string }[];
  enabled: boolean;
}

// 可用的短剧源配置
export const SHORT_DRAMA_SOURCES: ShortDramaSource[] = [
  {
    name: '1080zyku',
    api: 'https://api.1080zyku.com/inc/apijson.php',
    type: 'cms',
    categories: [
      { id: 117, name: '全部短剧' },
      { id: 96, name: '国产剧集' },
      { id: 100, name: '豪门甜宠' },
      { id: 102, name: '宫斗宅斗' },
      { id: 103, name: '脑洞穿越' },
      { id: 106, name: '仙侠玄幻' },
      { id: 110, name: '战神逆袭' },
      { id: 83, name: '编辑精选' },
    ],
    enabled: true,
  },
  {
    name: 'ffzyapi',
    api: 'https://api.ffzyapi.com/api.php/provide/vod',
    type: 'cms',
    categories: [{ id: 36, name: '热门短剧' }],
    enabled: true,
  },
  {
    name: 'lziapi',
    api: 'https://cj.lziapi.com/api.php/provide/vod',
    type: 'cms',
    categories: [
      { id: 46, name: '新上线' },
      { id: 52, name: 'AI漫剧' },
    ],
    enabled: true,
  },
];

// 获取所有启用的源
export function getEnabledSources(): ShortDramaSource[] {
  return SHORT_DRAMA_SOURCES.filter((s) => s.enabled);
}

// 获取所有短剧分类（合并去重）
export function getAllCategories(): {
  type_id: number;
  type_name: string;
  source: string;
}[] {
  const allCategories: {
    type_id: number;
    type_name: string;
    source: string;
  }[] = [];

  for (const source of getEnabledSources()) {
    for (const cat of source.categories) {
      // 去重：同名分类只保留第一个
      if (!allCategories.find((c) => c.type_name === cat.name)) {
        allCategories.push({
          type_id: cat.id,
          type_name: cat.name,
          source: source.name,
        });
      }
    }
  }

  return allCategories;
}

// ─── 主源短剧分类自动发现 ───

// 主源发现结果缓存（避免每次请求都探测全部主源）
let mainSourcesCache: {
  sources: ShortDramaSource[];
  fetchedAt: number;
} | null = null;

const MAIN_SOURCES_CACHE_TTL = 30 * 60 * 1000; // 30分钟

// 判断主源分类是否属于短剧（保守判定：分类名需明确包含"短剧"）
// 避免把通用"悬疑片/爱情片/玄幻"等分类误收进短剧栏目，同时排除成人向"擦边"内容
function isMainSourceShortDramaCategory(categoryName: string): boolean {
  if (!categoryName) return false;
  if (!categoryName.includes('短剧')) return false;
  if (categoryName.includes('擦边')) return false;
  return true;
}

// 探测单个主源是否含短剧分类
async function discoverMainSource(site: {
  name: string;
  api: string;
}): Promise<ShortDramaSource | null> {
  try {
    const listUrl = `${site.api}?ac=list`;
    const response = await fetch(listUrl, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const classes = data.class || [];
    const categories = classes
      .filter(
        (c: any) =>
          c.type_name && isMainSourceShortDramaCategory(String(c.type_name)),
      )
      .map((c: any) => ({ id: Number(c.type_id), name: String(c.type_name) }));

    if (categories.length === 0) return null;

    return {
      name: site.name,
      api: site.api,
      type: 'cms',
      categories,
      enabled: true,
    };
  } catch {
    return null;
  }
}

// 获取主源列表（优先 admin SourceConfig，失败时回退读取 sources-regular.json）
async function getMainSiteList(): Promise<{ name: string; api: string }[]> {
  try {
    const { getAvailableApiSites } = await import('@/lib/config');
    const sites = await getAvailableApiSites();
    if (sites && sites.length > 0) return sites;
  } catch (error) {
    console.warn(
      '[SHORTDRAMA] 获取主源配置失败，回退到 sources-regular.json:',
      error,
    );
  }

  // 回退：直接从 sources-regular.json 读取
  const { readFileSync } = await import('fs');
  const { join } = await import('path');
  const candidates = [
    join(process.cwd(), 'sources-regular.json'),
    join(process.cwd(), '.next', 'standalone', 'sources-regular.json'),
  ];
  for (const file of candidates) {
    try {
      const raw = JSON.parse(readFileSync(file, 'utf-8')) as {
        key: string;
        name: string;
        api: string;
      }[];
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((s) => ({ name: s.name, api: s.api }));
      }
    } catch {}
  }
  return [];
}

// 获取主源（admin SourceConfig）中包含短剧分类的源
async function getMainShortDramaSources(): Promise<ShortDramaSource[]> {
  if (
    mainSourcesCache &&
    Date.now() - mainSourcesCache.fetchedAt < MAIN_SOURCES_CACHE_TTL
  ) {
    return mainSourcesCache.sources;
  }

  const sites = await getMainSiteList();

  const results = await Promise.allSettled(
    sites.map((site) => discoverMainSource(site)),
  );

  const sources = results
    .filter(
      (r): r is PromiseFulfilledResult<ShortDramaSource | null> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value as ShortDramaSource);

  mainSourcesCache = { sources, fetchedAt: Date.now() };
  return sources;
}

// 获取全部短剧源（硬编码源 + 主源中自动发现的短剧源）
export async function getAllShortDramaSources(): Promise<ShortDramaSource[]> {
  const hardcoded = getEnabledSources();
  const mainSources = await getMainShortDramaSources();

  // 按 api 去重，避免硬编码源与主源重复
  const seenApis = new Set(hardcoded.map((s) => s.api));
  const merged = [...hardcoded];
  for (const source of mainSources) {
    if (!seenApis.has(source.api)) {
      seenApis.add(source.api);
      merged.push(source);
    }
  }
  return merged;
}

// 获取全部短剧分类（合并去重），并附带来源 API
export async function getAllCategoriesWithSource(): Promise<
  {
    type_id: number;
    type_name: string;
    source: string;
    source_api: string;
  }[]
> {
  const sources = await getAllShortDramaSources();
  const allCategories: {
    type_id: number;
    type_name: string;
    source: string;
    source_api: string;
  }[] = [];

  for (const source of sources) {
    for (const cat of source.categories) {
      // 去重：同名分类只保留第一个
      if (!allCategories.find((c) => c.type_name === cat.name)) {
        allCategories.push({
          type_id: cat.id,
          type_name: cat.name,
          source: source.name,
          source_api: source.api,
        });
      }
    }
  }

  return allCategories;
}
