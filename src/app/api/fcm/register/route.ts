import { NextResponse } from 'next/server';

// 内存存储 FCM tokens（生产环境应使用数据库）
const fcmTokens = new Map<
  string,
  { token: string; platform: string; appVersion: string; lastSeen: number }
>();

export async function POST(request: Request) {
  try {
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
export async function GET() {
  const tokens = Array.from(fcmTokens.values());
  return NextResponse.json({ tokens, count: tokens.length });
}
