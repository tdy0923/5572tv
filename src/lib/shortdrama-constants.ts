// 短剧系统共享常量
// 所有短剧相关的配置、关键词、缓存时间等统一定义在此文件

import { NextResponse } from 'next/server';

// 默认短剧源API（tyyszy.com）
export const DEFAULT_SHORT_DRAMA_API = 'https://tyyszy.com/api.php/provide/vod';

// 短剧分类关键词（超集 - 所有地方统一使用此列表）
export const SHORT_DRAMA_KEYWORDS = [
  '短剧',
  '女频恋爱',
  '反转爽剧',
  '古装仙侠',
  '年代穿越',
  '脑洞悬疑',
  '现代都市',
  '短篇',
  '短集',
  '擦边',
  '甜宠',
  '虐恋',
  '穿越',
  '重生',
  '总裁',
  '豪门',
  '逆袭',
  '复仇',
  '宠妻',
  '战神',
  '神医',
  '赘婿',
  '霸总',
  '甜剧',
  '虐剧',
  '爽剧',
];

// 排除的分类关键词
export const EXCLUDE_KEYWORDS = [
  '18+',
  '成人',
  '伦理',
  '禁片',
  '成人专区',
  '国产自拍',
  '自拍偷拍',
  '教程',
  '采集',
  '教学',
  '软件',
  '工具',
  '资源',
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
}

// 将原始API项映射为标准短剧项
export function mapApiItemToShortDramaItem(
  item: RawApiItem,
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
  };
}

// 检查分类名称是否为短剧相关
export function isShortDramaCategory(categoryName: string): boolean {
  if (!categoryName) return false;
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
