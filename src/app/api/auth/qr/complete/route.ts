import { NextRequest, NextResponse } from 'next/server';

import { setAuthClientCookies } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const QR_SESSION_PREFIX = 'qr_session:';
// 与旧 document.cookie 的 max-age 保持一致（7 天）
const QR_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface QRSession {
  sessionId: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  username?: string;
  token?: string;
}

// POST /api/auth/qr/complete - 桌面端轮询到 confirmed 后调用：
// 服务端校验会话、一次性核销，HttpOnly 种 Cookie（token 永不经过 JS）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: '缺少sessionId' }, { status: 400 });
    }

    const session: QRSession | null = await db.getCache(
      `${QR_SESSION_PREFIX}${sessionId}`,
    );

    if (!session || Date.now() > session.expiresAt) {
      if (session) await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
      return NextResponse.json({ error: '二维码已过期' }, { status: 410 });
    }

    if (session.status !== 'confirmed' || !session.token) {
      return NextResponse.json({ error: '尚未确认登录' }, { status: 400 });
    }

    let parsed: { username?: unknown; role?: unknown };
    try {
      parsed = JSON.parse(session.token);
    } catch {
      await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
      return NextResponse.json({ error: '登录票据异常' }, { status: 500 });
    }

    const username = typeof parsed.username === 'string' ? parsed.username : '';
    const role =
      parsed.role === 'owner' ||
      parsed.role === 'admin' ||
      parsed.role === 'user'
        ? parsed.role
        : 'user';
    if (!username) {
      await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
      return NextResponse.json({ error: '登录票据异常' }, { status: 500 });
    }

    // 一次性核销：先删会话再种 Cookie，防止重放
    await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);

    const response = NextResponse.json({ ok: true, username });
    setAuthClientCookies(
      response,
      session.token,
      new Date(Date.now() + QR_COOKIE_MAX_AGE_MS),
      username,
      role,
    );
    return response;
  } catch (error) {
    console.error('QR complete error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
