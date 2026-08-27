import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface RatingEntry {
  videoId: string;
  videoSource: string;
  title: string;
  poster?: string;
  avgRating: number;
  count: number;
}

const LEADERBOARD_CACHE_SECONDS = 5 * 60; // 5 分钟

interface StoredReview {
  rating?: number;
  videoTitle?: string;
  videoPoster?: string;
}

export async function GET() {
  try {
    // 命中缓存直接返回（v2 已过滤纯数字标题脏数据）
    const cached = await db.getCache('rating:leaderboard:v2');
    if (Array.isArray(cached)) {
      return NextResponse.json({ success: true, list: cached });
    }

    // 扫描所有评论键 reviews:{source}:{videoId}，直接聚合（兼容历史数据，无需单独维护聚合键）
    const keys = await db.getCacheKeysByPrefix('reviews:');
    const aggMap = new Map<string, RatingEntry>();

    for (const key of keys) {
      const rest = key.slice('reviews:'.length);
      const sep = rest.lastIndexOf(':');
      if (sep <= 0 || sep >= rest.length - 1) continue;

      const videoSource = rest.slice(0, sep);
      const videoId = rest.slice(sep + 1);

      const reviews = (await db.getCache(key)) as StoredReview[] | null;
      if (!Array.isArray(reviews) || reviews.length === 0) continue;

      let total = 0;
      let count = 0;
      let title = '';
      let poster: string | undefined;

      for (const r of reviews) {
        if (typeof r?.rating !== 'number') continue;
        total += r.rating;
        count++;
        if (!title && typeof r.videoTitle === 'string') title = r.videoTitle;
        if (!poster && typeof r.videoPoster === 'string')
          poster = r.videoPoster;
      }

      if (count === 0) continue;

      // 跳过纯数字标题（历史脏数据，videoId 回退），避免“影片 #69446”展示
      const finalTitle = title && !/^\d+$/.test(title) ? title : '';
      if (!finalTitle) continue;

      const aggKey = `${videoSource}:${videoId}`;
      aggMap.set(aggKey, {
        videoId,
        videoSource,
        title: finalTitle,
        poster,
        avgRating: Math.round((total / count) * 10) / 10,
        count,
      });
    }

    const list = Array.from(aggMap.values())
      .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count)
      .slice(0, 100);

    // 写缓存
    await db
      .setCache('rating:leaderboard:v2', list, LEADERBOARD_CACHE_SECONDS)
      .catch(() => {});

    return NextResponse.json({ success: true, list });
  } catch (error) {
    console.error('获取评分排行榜失败:', error);
    return NextResponse.json({ success: false, list: [] }, { status: 500 });
  }
}
