import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 热门搜索词（静态列表，可后续改为动态）
const TRENDING_SEARCHES = [
  '低智商犯罪', '庆余年', '三体', '狂飙', '繁花',
  '流浪地球', '封神', '长安三万里', '消失的她', '孤注一掷',
  '鬼吹灯', '盗墓笔记', '斗破苍穹', '完美世界', '凡人修仙传',
];

export async function GET() {
  // 尝试从缓存获取
  const cached = await db.getCache('trending_searches');
  if (cached) {
    return NextResponse.json({ trending: cached });
  }

  // 缓存1小时
  await db.setCache('trending_searches', TRENDING_SEARCHES, 3600);
  return NextResponse.json({ trending: TRENDING_SEARCHES });
}
