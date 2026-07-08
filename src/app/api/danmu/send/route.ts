import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 简单限流：每用户每分钟最多10条
const danmuRateLimit = new Map<string, number[]>();

function checkDanmuRateLimit(username: string): boolean {
  const now = Date.now();
  const window = 60000;
  const max = 10;
  const timestamps = danmuRateLimit.get(username) || [];
  const recent = timestamps.filter((t) => now - t < window);
  if (recent.length >= max) return false;
  recent.push(now);
  danmuRateLimit.set(username, recent);
  return true;
}

interface DanmuItem {
  text: string;
  color: string;
  time: number;
  type: 'scroll' | 'top' | 'bottom';
  username: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    if (!checkDanmuRateLimit(authInfo.username)) {
      return NextResponse.json(
        { error: '发送太频繁，请稍后再试' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const {
      text,
      color = '#ffffff',
      time = 0,
      type = 'scroll',
      videoId,
      videoSource,
    } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: '弹幕内容不能为空' }, { status: 400 });
    }

    if (text.length > 100) {
      return NextResponse.json(
        { error: '弹幕内容不能超过100字' },
        { status: 400 },
      );
    }

    if (!videoId || !videoSource) {
      return NextResponse.json({ error: '缺少视频信息' }, { status: 400 });
    }

    // 创建弹幕数据
    const danmu: DanmuItem = {
      text: text.trim(),
      color,
      time: Math.max(0, time),
      type,
      username: authInfo.username,
      timestamp: Date.now(),
    };

    // 保存到数据库
    const cacheKey = `danmu-user:${videoSource}:${videoId}`;
    try {
      const existing = await db.getCache(cacheKey);
      const danmuList = Array.isArray(existing) ? existing : [];
      danmuList.push(danmu);

      // 限制最多保存 1000 条用户弹幕
      if (danmuList.length > 1000) {
        danmuList.splice(0, danmuList.length - 1000);
      }

      await db.setCache(cacheKey, danmuList, 7 * 24 * 60 * 60); // 7天缓存
    } catch (error) {
      console.error('保存弹幕失败:', error);
    }

    return NextResponse.json({
      success: true,
      danmu,
      message: '弹幕发送成功',
    });
  } catch (error) {
    console.error('弹幕发送失败:', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}

// 获取用户弹幕
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const videoSource = searchParams.get('videoSource');

    if (!videoId || !videoSource) {
      return NextResponse.json({ error: '缺少视频信息' }, { status: 400 });
    }

    const cacheKey = `danmu-user:${videoSource}:${videoId}`;
    const existing = await db.getCache(cacheKey);
    const danmuList = Array.isArray(existing) ? existing : [];

    return NextResponse.json({
      success: true,
      danmuList,
      count: danmuList.length,
    });
  } catch (error) {
    console.error('获取弹幕失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
