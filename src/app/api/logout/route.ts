import { NextRequest, NextResponse } from 'next/server';

import { revokeToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Revoke current token before clearing cookie
  const authCookie =
    request.cookies.get('user_auth') || request.cookies.get('auth');
  if (authCookie) {
    try {
      const authData = JSON.parse(authCookie.value);
      if (authData.username && authData.timestamp) {
        await revokeToken(authData.username, authData.timestamp);
      }
    } catch {
      // Cookie parsing failed — safe to ignore
    }
  }

  const response = NextResponse.json({ ok: true });

  // 清除新的认证cookie (user_auth)
  response.cookies.set('user_auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });

  // 同时清除旧的认证cookie (auth) 以保持兼容性
  response.cookies.set('auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
