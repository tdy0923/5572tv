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
