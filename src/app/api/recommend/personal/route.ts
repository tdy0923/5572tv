import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PlayRecordLike {
  title?: string;
  type?: string;
  douban_id?: number;
  save_time?: number;
}

interface RecommendItem {
  id: string;
  title: string;
  year: string;
  poster: string;
  type: string;
  rating: number;
}

// 根据用户播放记录的主流类型，推荐该类型高分未看内容
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthInfoFromCookie(request);
    if (!auth || !auth.username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const records = await db.getAllPlayRecords(auth.username);
    const list = Object.values(records) as PlayRecordLike[];
    if (list.length < 2) {
      return NextResponse.json({ success: true, list: [] });
    }

    // 统计主流类型
    const typeCount: Record<string, number> = {};
    for (const r of list) {
      const t = r.type === 'tv' ? 'tv' : r.type === 'anime' ? 'anime' : 'movie';
      typeCount[t] = (typeCount[t] || 0) + 1;
    }
    const dominantType =
      Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'movie';

    // 已看过的标题集合（用于排除）
    const watchedTitles = new Set(
      list.map((r) => (r.title || '').trim().toLowerCase()).filter(Boolean),
    );

    // 获取该类型豆瓣高分内容
    const base = process.env.SITE_BASE || 'http://localhost:3000';
    const doubanRes = await fetch(
      `${base}/api/douban?type=${dominantType}&tag=豆瓣高分&page=0&pageSize=20`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!doubanRes.ok) {
      return NextResponse.json({ success: true, list: [] });
    }
    const doubanData = await doubanRes.json();
    const subjects: any[] = Array.isArray(doubanData.subjects)
      ? doubanData.subjects
      : Array.isArray(doubanData.list)
        ? doubanData.list
        : [];

    const items: RecommendItem[] = [];
    for (const s of subjects) {
      const title = (s.title || '').trim();
      if (!title) continue;
      if (watchedTitles.has(title.toLowerCase())) continue;
      items.push({
        id: String(s.id || ''),
        title,
        year: String(s.year || ''),
        poster: s.poster || s.cover || '',
        type: dominantType,
        rating: Number(s.rate || s.rating?.value || 0),
      });
      if (items.length >= 12) break;
    }

    return NextResponse.json({
      success: true,
      list: items,
      type: dominantType,
    });
  } catch (error) {
    console.error('个性化推荐失败:', error);
    return NextResponse.json({ success: true, list: [] });
  }
}
