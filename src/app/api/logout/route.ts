import { NextRequest, NextResponse } from 'next/server';

import { clearAuthClientCookies, revokeToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authCookie =
    request.cookies.get('user_auth') || request.cookies.get('auth');
  if (authCookie) {
    try {
      const authData = JSON.parse(authCookie.value);
      if (authData.username && authData.timestamp) {
        await revokeToken(authData.username, authData.timestamp);
      }
    } catch {}
  }

  const response = NextResponse.json({ ok: true });
  clearAuthClientCookies(response);
  return response;
}
