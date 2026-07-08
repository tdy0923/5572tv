import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

// 内存存储 FCM tokens（生产环境应使用数据库）
const fcmTokens = new Map<
  string,
  { token: string; platform: string; appVersion: string; lastSeen: number }
>();

// 简单限流：每用户每5分钟最多注册5次
const fcmRateLimit = new Map<string, number[]>();

function checkFcmRateLimit(username: string): boolean {
  const now = Date.now();
  const window = 300000;
  const max = 5;
  const timestamps = fcmRateLimit.get(username) || [];
  const recent = timestamps.filter((t) => now - t < window);
  if (recent.length >= max) return false;
  recent.push(now);
  fcmRateLimit.set(username, recent);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkFcmRateLimit(authInfo.username)) {
      return NextResponse.json({ error: '请求太频繁' }, { status: 429 });
    }

    const body = await request.json();
    const { token, platform, appVersion } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // 存储 token
    fcmTokens.set(token, {
      token,
      platform: platform || 'android',
      appVersion: appVersion || '1.8.0',
      lastSeen: Date.now(),
    });

    return NextResponse.json({ success: true, totalTokens: fcmTokens.size });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// 获取所有注册的 tokens（供管理界面使用）
export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tokens = Array.from(fcmTokens.values());
  return NextResponse.json({ tokens, count: tokens.length });
}
