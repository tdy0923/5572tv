/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const runtime = 'nodejs';

const QR_SESSION_PREFIX = 'qr_session:';

interface QRSession {
  sessionId: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  username?: string;
  token?: string;
}

// POST /api/auth/qr/cancel - Cancel QR login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: '缺少sessionId' }, { status: 400 });
    }

    const session: QRSession | null = await db.getCache(
      `${QR_SESSION_PREFIX}${sessionId}`,
    );

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    if (session.status === 'confirmed') {
      return NextResponse.json(
        { error: '二维码已使用，无法取消' },
        { status: 409 },
      );
    }

    const updatedSession: QRSession = {
      ...session,
      status: 'cancelled',
    };
    await db.setCache(`${QR_SESSION_PREFIX}${sessionId}`, updatedSession, 60);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('QR cancel error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
