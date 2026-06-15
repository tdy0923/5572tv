/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const runtime = 'nodejs';

const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

const QR_SESSION_TTL = 300; // 5 minutes in seconds
const QR_SESSION_PREFIX = 'qr_session:';
const QR_POLL_TIMEOUT = 30000; // 30 seconds long-poll

interface QRSession {
  sessionId: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  username?: string;
  token?: string;
}

// Generate unique session ID
function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// POST /api/auth/qr - Create new QR session
export async function POST(req: NextRequest) {
  try {
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json(
        { error: '扫码登录需要数据库存储，请使用密码登录' },
        { status: 400 },
      );
    }

    const sessionId = generateSessionId();
    const now = Date.now();
    const session: QRSession = {
      sessionId,
      status: 'pending',
      createdAt: now,
      expiresAt: now + QR_SESSION_TTL * 1000,
    };

    await db.setCache(
      `${QR_SESSION_PREFIX}${sessionId}`,
      session,
      QR_SESSION_TTL,
    );

    const host =
      req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;
    const qrUrl = `${baseUrl}/qr-login?sid=${sessionId}`;

    return NextResponse.json({
      sessionId,
      qrUrl,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Create QR session error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// GET /api/auth/qr?sessionId=xxx - Check QR scan status (long-polling)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: '缺少sessionId' }, { status: 400 });
    }

    const session: QRSession | null = await db.getCache(
      `${QR_SESSION_PREFIX}${sessionId}`,
    );

    if (!session) {
      return NextResponse.json({ status: 'expired' });
    }

    if (Date.now() > session.expiresAt) {
      await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
      return NextResponse.json({ status: 'expired' });
    }

    if (session.status === 'confirmed' && session.token) {
      await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
      return NextResponse.json({
        status: 'confirmed',
        token: session.token,
        username: session.username,
      });
    }

    if (session.status === 'cancelled') {
      await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
      return NextResponse.json({ status: 'cancelled' });
    }

    // Long-polling: wait up to QR_POLL_TIMEOUT for status change
    const startTime = Date.now();
    while (Date.now() - startTime < QR_POLL_TIMEOUT) {
      const current: QRSession | null = await db.getCache(
        `${QR_SESSION_PREFIX}${sessionId}`,
      );

      if (!current || Date.now() > current.expiresAt) {
        return NextResponse.json({ status: 'expired' });
      }

      if (current.status !== session.status) {
        if (current.status === 'confirmed' && current.token) {
          await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
          return NextResponse.json({
            status: 'confirmed',
            token: current.token,
            username: current.username,
          });
        }
        if (current.status === 'cancelled') {
          await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
          return NextResponse.json({ status: 'cancelled' });
        }
        return NextResponse.json({ status: current.status });
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return NextResponse.json({ status: session.status });
  } catch (error) {
    console.error('Check QR status error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
