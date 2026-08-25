import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { searchSubtitles } from '@/lib/subtitle-providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SEARCH_CACHE_SECONDS = 60 * 60; // 1 小时

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const title = searchParams.get('title')?.trim();
    const year = searchParams.get('year')?.trim() || undefined;

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: '缺少片名参数 title' },
        { status: 400 },
      );
    }

    // 命中缓存直接返回（缓存键按 title+year）
    const cacheKey = `subtitle:search:${title}:${year || ''}`;
    const cached = await db.getCache(cacheKey);
    if (Array.isArray(cached)) {
      return NextResponse.json({ success: true, list: cached });
    }

    const list = await searchSubtitles(title, year);

    // 只缓存非空结果，避免缓存空数据
    if (list.length > 0) {
      await db.setCache(cacheKey, list, SEARCH_CACHE_SECONDS).catch(() => {});
    }

    return NextResponse.json({ success: true, list });
  } catch (error) {
    console.error('字幕搜索失败:', error);
    return NextResponse.json({ success: false, list: [] }, { status: 500 });
  }
}
