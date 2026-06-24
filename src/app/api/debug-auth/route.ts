import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const authCookie =
    request.cookies.get('user_auth') || request.cookies.get('auth');
  if (!authCookie)
    return NextResponse.json({
      step: 'no_cookie',
      allCookies: [...request.cookies].map((c) => c.name),
    });
  const raw = authCookie.value;
  let parsed1 = null,
    parsed2 = null,
    parsed3 = null;
  try {
    parsed1 = JSON.parse(raw);
  } catch {}
  try {
    parsed2 = JSON.parse(decodeURIComponent(raw));
  } catch {}
  try {
    parsed3 = JSON.parse(decodeURIComponent(decodeURIComponent(raw)));
  } catch {}
  return NextResponse.json({
    rawLen: raw.length,
    rawStart: raw.substring(0, 80),
    parsed1: parsed1
      ? {
          username: parsed1.username,
          role: parsed1.role,
          hasSig: !!parsed1.signature,
        }
      : null,
    parsed2: parsed2
      ? {
          username: parsed2.username,
          role: parsed2.role,
          hasSig: !!parsed2.signature,
        }
      : null,
    parsed3: parsed3
      ? {
          username: parsed3.username,
          role: parsed3.role,
          hasSig: !!parsed3.signature,
        }
      : null,
  });
}
