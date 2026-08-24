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

// ─────────────────────────────────────────────
// 统一短剧分类体系
// 各源分类名五花八门且同义不同名（"短剧大全"/"全部短剧"/"热门短剧"、
// "国产剧集"等），直接展示会凌乱重复。这里用一套标准分类白名单，
// 把各源分类归一化到统一命名，按固定顺序展示。
// ─────────────────────────────────────────────

export interface StandardCategory {
  /** 展示名（统一命名） */
  name: string;
  /** 前端 key */
  key: string;
}

// 标准分类（固定顺序）：状态 → 内容类型 → 特殊
export const STANDARD_CATEGORIES: StandardCategory[] = [
  { name: '热门短剧', key: 'hot' },
  { name: '新上线', key: 'new' },
  { name: '豪门甜宠', key: 'sweet' },
  { name: '宫斗宅斗', key: 'court' },
  { name: '脑洞穿越', key: 'time' },
  { name: '仙侠玄幻', key: 'fantasy' },
  { name: '战神逆袭', key: 'hero' },
  { name: '爽文逆袭', key: 'power' },
  { name: 'AI漫剧', key: 'ai' },
  { name: '编辑精选', key: 'editor' },
];

// 各源分类 → 标准分类名的归一化映射（覆盖常见同义变体）
const CATEGORY_ALIAS_MAP: Record<string, string> = {
  // "全部"语义的分类直接映射为 null（不展示为独立分类，前端"全部"即默认）
  全部短剧: '',
  短剧大全: '',
  全部: '',
  全部短剧大全: '',
  热门短剧: '热门短剧',
  热门: '热门短剧',
  热播短剧: '热门短剧',
  人气短剧: '热门短剧',
  新上线: '新上线',
  最新: '新上线',
  最新短剧: '新上线',
  新剧: '新上线',
  上新: '新上线',
  豪门甜宠: '豪门甜宠',
  甜宠: '豪门甜宠',
  甜宠短剧: '豪门甜宠',
  现代甜宠: '豪门甜宠',
  宫斗宅斗: '宫斗宅斗',
  宫斗: '宫斗宅斗',
  宅斗: '宫斗宅斗',
  古装: '宫斗宅斗',
  古装短剧: '宫斗宅斗',
  脑洞穿越: '脑洞穿越',
  穿越: '脑洞穿越',
  穿越短剧: '脑洞穿越',
  重生穿越: '脑洞穿越',
  仙侠玄幻: '仙侠玄幻',
  玄幻: '仙侠玄幻',
  仙侠: '仙侠玄幻',
  玄幻短剧: '仙侠玄幻',
  战神逆袭: '战神逆袭',
  战神: '战神逆袭',
  逆袭: '战神逆袭',
  爽文逆袭: '爽文逆袭',
  爽文: '爽文逆袭',
  爽文短剧: '爽文逆袭',
  AI漫剧: 'AI漫剧',
  AI短剧: 'AI漫剧',
  AI动画: 'AI漫剧',
  编辑精选: '编辑精选',
  精选: '编辑精选',
  小编精选: '编辑精选',
};

// 归一化：源分类名 → 标准分类名；无法识别的分类返回 null（不展示）
function normalizeCategoryName(rawName: string): string | null {
  if (!rawName) return null;
  // 去掉可能的空格
  const name = String(rawName).trim();
  if (name in CATEGORY_ALIAS_MAP) {
    // "全部"语义 → null（跳过，前端"全部"即默认展示全部内容）
    return CATEGORY_ALIAS_MAP[name] || null;
  }
  // 模糊匹配：包含关键词
  const keywordMap: [RegExp, string][] = [
    [/甜宠|宠妻|霸道总裁|总裁/, '豪门甜宠'],
    [/宫斗|宅斗|娘娘|后宫/, '宫斗宅斗'],
    [/穿越|重生/, '脑洞穿越'],
    [/玄幻|仙侠|修仙|仙魔/, '仙侠玄幻'],
    [/战神|龙婿|龙王/, '战神逆袭'],
    [/爽文|赘婿|逆袭|战神逆袭/, '爽文逆袭'],
    [/AI|漫剧|动漫/, 'AI漫剧'],
    [/热门|热播|人气|精选/, '热门短剧'],
    [/新|最新|上新|完结/, '新上线'],
  ];
  for (const [re, standard] of keywordMap) {
    if (re.test(name)) return standard;
  }
  return null;
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
// 返回按 STANDARD_CATEGORIES 顺序排列的统一分类
export async function getAllCategoriesWithSource(): Promise<
  {
    type_id: number;
    type_name: string;
    source: string;
    source_api: string;
  }[]
> {
  const sources = await getAllShortDramaSources();

  // 标准分类名 → 最佳代表（优先硬编码源，其次主源）
  const best = new Map<
    string,
    { type_id: number; source: string; source_api: string }
  >();

  // 硬编码源优先级最高
  const hardcodedNames = new Set(
    getEnabledSources().flatMap((s) => s.categories.map((c) => c.name)),
  );

  for (const source of sources) {
    for (const cat of source.categories) {
      const standardName = normalizeCategoryName(cat.name);
      if (!standardName) continue;
      const existing = best.get(standardName);
      if (!existing) {
        best.set(standardName, {
          type_id: cat.id,
          source: source.name,
          source_api: source.api,
        });
      } else if (hardcodedNames.has(cat.name)) {
        // 硬编码源覆盖主源
        best.set(standardName, {
          type_id: cat.id,
          source: source.name,
          source_api: source.api,
        });
      }
    }
  }

  // 按 STANDARD_CATEGORIES 顺序输出
  const result: {
    type_id: number;
    type_name: string;
    source: string;
    source_api: string;
  }[] = [];
  for (const standard of STANDARD_CATEGORIES) {
    const entry = best.get(standard.name);
    if (entry) {
      result.push({
        type_id: entry.type_id,
        type_name: standard.name,
        source: entry.source,
        source_api: entry.source_api,
      });
    }
  }
  return result;
}
