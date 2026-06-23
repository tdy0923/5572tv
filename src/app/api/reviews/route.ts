import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Review {
  id: string;
  username: string;
  videoId: string;
  videoSource: string;
  rating: number; // 1-5
  comment: string;
  createdAt: number;
  likes: number;
}

// 获取视频评论
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const videoSource = searchParams.get('videoSource');

    if (!videoId || !videoSource) {
      return NextResponse.json({ error: '缺少视频信息' }, { status: 400 });
    }

    const cacheKey = `reviews:${videoSource}:${videoId}`;
    const existing = await db.getCache(cacheKey);
    const reviews = Array.isArray(existing) ? existing : [];

    // 按时间倒序排列
    reviews.sort((a: Review, b: Review) => b.createdAt - a.createdAt);

    // 计算平均评分
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) /
          reviews.length
        : 0;

    return NextResponse.json({
      success: true,
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      count: reviews.length,
    });
  } catch (error) {
    console.error('获取评论失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 发表评论
export async function POST(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, videoSource, rating, comment } = body;

    if (!videoId || !videoSource) {
      return NextResponse.json({ error: '缺少视频信息' }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '评分必须在1-5之间' }, { status: 400 });
    }

    if (comment && comment.length > 500) {
      return NextResponse.json({ error: '评论不能超过500字' }, { status: 400 });
    }

    const review: Review = {
      id: `${authInfo.username}-${videoId}-${Date.now()}`,
      username: authInfo.username,
      videoId,
      videoSource,
      rating: Math.round(rating),
      comment: comment || '',
      createdAt: Date.now(),
      likes: 0,
    };

    // 保存评论
    const cacheKey = `reviews:${videoSource}:${videoId}`;
    const existing = await db.getCache(cacheKey);
    const reviews = Array.isArray(existing) ? existing : [];

    // 检查是否已经评论过，如果评论过则更新
    const existingIndex = reviews.findIndex(
      (r: Review) => r.username === authInfo.username,
    );
    if (existingIndex >= 0) {
      reviews[existingIndex] = review;
    } else {
      reviews.push(review);
    }

    await db.setCache(cacheKey, reviews, 365 * 24 * 60 * 60); // 1年缓存

    return NextResponse.json({
      success: true,
      review,
      message: existingIndex >= 0 ? '评论已更新' : '评论发表成功',
    });
  } catch (error) {
    console.error('发表评论失败:', error);
    return NextResponse.json({ error: '发表失败' }, { status: 500 });
  }
}
