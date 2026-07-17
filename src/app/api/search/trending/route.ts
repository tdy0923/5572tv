import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 热门搜索词（静态列表，作为数据库不可用时的兜底）
const TRENDING_SEARCHES = [
  '低智商犯罪',
  '庆余年',
  '三体',
  '狂飙',
  '繁花',
  '流浪地球',
  '封神',
  '长安三万里',
  '消失的她',
  '孤注一掷',
  '鬼吹灯',
  '盗墓笔记',
  '斗破苍穹',
  '完美世界',
  '凡人修仙传',
];

export async function GET() {
  // 1. 尝试从缓存获取
  const cached = await db.getCache('trending_searches');
  if (cached) {
    const response = NextResponse.json({ trending: cached });
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600',
    );
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=3600');
    return response;
  }

  // 2. 尝试从数据库获取动态热门搜索词
  try {
    const queryCounts = await db.getCache('trending:queries');
    if (Array.isArray(queryCounts) && queryCounts.length > 0) {
      const dynamicTrending = queryCounts
        .slice(0, 15)
        .map((q: { query: string; count: number }) => q.query);

      await db.setCache('trending_searches', dynamicTrending, 3600);
      const response = NextResponse.json({ trending: dynamicTrending });
      response.headers.set(
        'Cache-Control',
        'public, max-age=3600, s-maxage=3600',
      );
      response.headers.set('CDN-Cache-Control', 'public, s-maxage=3600');
      return response;
    }
  } catch {
    // 数据库查询失败，继续使用兜底列表
  }

  // 3. 兜底：使用静态列表
  await db.setCache('trending_searches', TRENDING_SEARCHES, 3600);
  const response = NextResponse.json({ trending: TRENDING_SEARCHES });
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  response.headers.set('CDN-Cache-Control', 'public, s-maxage=3600');
  return response;
}
