import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

// 内存存储 FCM tokens（生产环境应使用数据库）
const fcmTokens = new Map<
  string,
  { token: string; platform: string; appVersion: string; lastSeen: number }
>();

// 简单限流：每用户每5分钟最多注册5次
const fcmRateLimit = new Map<string, number[]>();

// Token 失效时间：30 天未活跃则清理
const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;

// 定期清理过期 tokens 与限流条目，防止内存无限增长
function pruneFcmData() {
  const now = Date.now();
  for (const [token, info] of fcmTokens.entries()) {
    if (now - info.lastSeen > TOKEN_TTL) fcmTokens.delete(token);
  }
  for (const [username, timestamps] of fcmRateLimit.entries()) {
    if (
      timestamps.length === 0 ||
      now - timestamps[timestamps.length - 1] > 300000
    ) {
      fcmRateLimit.delete(username);
    }
  }
}

function checkFcmRateLimit(username: string): boolean {
  const now = Date.now();
  const window = 300000;
  const max = 5;
  const timestamps = fcmRateLimit.get(username) || [];
  const recent = timestamps.filter((t) => now - t < window);
  if (recent.length >= max) return false;
  recent.push(now);
  fcmRateLimit.set(username, recent);
  // 定期清理（随机采样控制开销）
  if (fcmTokens.size + fcmRateLimit.size > 200 && Math.random() < 0.01) {
    pruneFcmData();
  }
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

// 获取所有注册的 tokens（仅供站长使用）
export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo?.username || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tokens = Array.from(fcmTokens.values());
  return NextResponse.json({ tokens, count: tokens.length });
}
