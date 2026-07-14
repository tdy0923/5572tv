// 短剧系统共享常量
// 所有短剧相关的配置、关键词、缓存时间等统一定义在此文件

import { NextResponse } from 'next/server';

// 默认短剧源API（hongniuzy2.com - 34000+短剧）
export const DEFAULT_SHORT_DRAMA_API =
  'https://www.hongniuzy2.com/api.php/provide/vod';

// 短剧分类关键词
export const SHORT_DRAMA_KEYWORDS = [
  '短剧',
  '女频恋爱',
  '反转爽剧',
  '古装仙侠',
  '年代穿越',
  '脑洞悬疑',
  '现代都市',
  '战神',
  '豪门',
  '宫斗',
  '甜宠',
  '虐恋',
  '逆袭',
  '复仇',
  '总裁',
  '赘婿',
  '霸总',
  '神医',
  '宠妻',
  '穿越',
  '重生',
  '悬疑',
  '玄幻',
  '爱情',
];

// 排除的分类关键词（明确不是短剧的内容）
export const EXCLUDE_KEYWORDS = [
  // 成人内容
  '18+',
  '成人',
  '伦理',
  '禁片',
  '成人专区',
  '国产自拍',
  '自拍偷拍',
  // 动漫
  '动漫',
  '动画',
  '漫画',
  '番剧',
  '剧场版',
  // 电影
  '电影',
  '喜剧片',
  '剧情片',
  '动作片',
  '恐怖片',
  '科幻片',
  '爱情片',
  // 综艺/纪录片
  '综艺',
  '纪录片',
  // 电视剧（非短剧）
  '连续剧',
  '国产剧',
  '香港剧',
  '韩国剧',
  '欧美剧',
  '台湾剧',
  '日本剧',
  '韩剧',
  '港台剧',
  '日剧',
  '马泰剧',
  '内地剧',
  '港剧',
  '台剧',
  '泰剧',
  '美国剧',
  '大陆剧',
  '港澳剧',
  '美剧',
  '泰剧',
  // 其他
  '福利',
  '写真',
  'coser',
  'COSER',
];

// 缓存时间配置（秒）- 单一数据源，服务端和客户端统一使用
export const SHORTDRAMA_CACHE_SECONDS = {
  categories: 4 * 60 * 60, // 分类4小时（很少变化）
  lists: 2 * 60 * 60, // 列表2小时（更新频繁）
  search: 1 * 60 * 60, // 搜索1小时
  recommend: 1 * 60 * 60, // 推荐1小时（经常更新）
  detail: 4 * 60 * 60, // 详情4小时（变化较少）
  parse: 30 * 60, // 解析结果30分钟（URL会过期）
  episodes: 24 * 60 * 60, // 集数24小时（基本不变）
} as const;

// 原始API项类型
interface RawApiItem {
  vod_id: number;
  vod_name: string;
  vod_pic?: string;
  vod_pic_slide?: string;
  vod_time?: string;
  vod_score?: string;
  vod_remarks?: string;
  vod_content?: string;
  vod_blurb?: string;
  vod_actor?: string;
  vod_area?: string;
  vod_year?: string;
  vod_hits?: string;
  type_id?: number;
  type_name?: string;
  [key: string]: any;
}

// 映射后的短剧项类型
export interface MappedShortDramaItem {
  id: number;
  name: string;
  cover: string;
  update_time: string;
  score: number;
  episode_count: number;
  description: string;
  author: string;
  backdrop: string;
  vote_average: number;
  vod_area: string;
  vod_year: string;
  vod_time: number;
  vod_hits: number;
  vod_name: string;
  type_id?: number;
  type_name?: string;
  source_api?: string;
}

// 将原始API项映射为标准短剧项
export function mapApiItemToShortDramaItem(
  item: RawApiItem,
  sourceApi?: string,
): MappedShortDramaItem {
  return {
    id: item.vod_id,
    name: item.vod_name,
    cover: item.vod_pic || '',
    update_time: item.vod_time || new Date().toISOString(),
    score: parseFloat(item.vod_score || '0') || 0,
    episode_count: parseInt(item.vod_remarks?.replace(/[^\d]/g, '') || '1'),
    description: item.vod_content || item.vod_blurb || '',
    author: item.vod_actor || '',
    backdrop: item.vod_pic_slide || item.vod_pic || '',
    vote_average: parseFloat(item.vod_score || '0') || 0,
    vod_area: item.vod_area || '',
    vod_year: item.vod_year || '',
    vod_time: item.vod_time ? new Date(item.vod_time).getTime() / 1000 : 0,
    vod_hits: parseInt(item.vod_hits || '0'),
    vod_name: item.vod_name || '',
    type_id: item.type_id,
    type_name: item.type_name,
    source_api: sourceApi,
  };
}

// 检查分类名称是否为短剧相关
export function isShortDramaCategory(categoryName: string): boolean {
  if (!categoryName) return false;
  // 先检查是否应该排除
  if (isExcludedCategory(categoryName)) return false;
  // 必须精确匹配短剧关键词（不再使用宽泛的"剧"字匹配）
  return SHORT_DRAMA_KEYWORDS.some((keyword) => categoryName.includes(keyword));
}

// 检查分类是否应该被排除
export function isExcludedCategory(categoryName: string): boolean {
  if (!categoryName) return false;
  return EXCLUDE_KEYWORDS.some((keyword) => categoryName.includes(keyword));
}

// 应用HTTP缓存头到NextResponse
export function applyShortDramaCacheHeaders(
  response: NextResponse,
  cacheDuration: number,
): NextResponse {
  response.headers.set(
    'Cache-Control',
    `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}`,
  );
  response.headers.set(
    'CDN-Cache-Control',
    `public, s-maxage=${cacheDuration}`,
  );
  response.headers.set(
    'Vercel-CDN-Cache-Control',
    `public, s-maxage=${cacheDuration}`,
  );
  response.headers.set('X-Cache-Duration', `${cacheDuration}s`);
  response.headers.set(
    'X-Cache-Expires-At',
    new Date(Date.now() + cacheDuration * 1000).toISOString(),
  );
  response.headers.set('Vary', 'Accept-Encoding, User-Agent');
  return response;
}
