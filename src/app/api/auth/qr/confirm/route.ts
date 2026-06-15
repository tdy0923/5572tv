/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import {
  checkFail2Ban,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from '@/lib/fail2ban';

export const runtime = 'nodejs';

const QR_SESSION_PREFIX = 'qr_session:';

// Generate auth cookie value
async function generateAuthCookie(
  username: string,
  password: string,
  role: 'owner' | 'admin' | 'user',
): Promise<string> {
  const authData: any = { role };
  authData.username = username;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(process.env.PASSWORD || '');
  const messageData = encoder.encode(username);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  authData.signature = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  authData.timestamp = Date.now();
  authData.loginTime = Date.now();

  return encodeURIComponent(JSON.stringify(authData));
}

interface QRSession {
  sessionId: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  username?: string;
  token?: string;
}

// POST /api/auth/qr/confirm - Confirm QR login from mobile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, username, password } = body;

    if (!sessionId) {
      return NextResponse.json({ error: '缺少sessionId' }, { status: 400 });
    }

    const session: QRSession | null = await db.getCache(
      `${QR_SESSION_PREFIX}${sessionId}`,
    );

    if (!session) {
      return NextResponse.json(
        { error: '二维码已过期或无效' },
        { status: 404 },
      );
    }

    if (Date.now() > session.expiresAt) {
      await db.deleteCache(`${QR_SESSION_PREFIX}${sessionId}`);
      return NextResponse.json({ error: '二维码已过期' }, { status: 410 });
    }

    if (session.status === 'confirmed') {
      return NextResponse.json({ error: '二维码已使用' }, { status: 409 });
    }

    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Fail2ban check
    const f2b = checkFail2Ban(ip);
    if (f2b.blocked) {
      return NextResponse.json(
        { error: '访问已被暂时封禁，请稍后再试' },
        { status: 429 },
      );
    }

    // Verify credentials
    const envUsername = process.env.USERNAME;
    const envPassword = process.env.PASSWORD;

    let verified = false;
    let role: 'owner' | 'admin' | 'user' = 'user';

    if (username && password) {
      // Check owner credentials first
      if (username === envUsername && password === envPassword) {
        verified = true;
        role = 'owner';
      } else {
        // Check database users
        try {
          const userV2 = await db.getUserInfoV2(username);
          if (userV2 && !userV2.banned) {
            const pass = await db.verifyUserV2(username, password);
            if (pass) {
              verified = true;
              role = userV2.role || 'user';
            }
          } else {
            // Fallback to v1 verification
            const pass = await db.verifyUser(username, password);
            if (pass) {
              verified = true;
            }
          }
        } catch (err) {
          console.error('QR confirm: DB verify failed', err);
        }
      }
    }

    if (!verified) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    recordSuccessfulLogin(ip);

    // Generate token
    const token = await generateAuthCookie(username, password, role);

    // Update session
    const updatedSession: QRSession = {
      ...session,
      status: 'confirmed',
      username,
      token,
    };
    await db.setCache(`${QR_SESSION_PREFIX}${sessionId}`, updatedSession, 300);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('QR confirm error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
