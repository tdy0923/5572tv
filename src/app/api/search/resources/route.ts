import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';

export const runtime = 'nodejs';

// OrionTV 兼容接口
export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  const username = authInfo?.username;

  try {
    const apiSites = await getAvailableApiSites(username);

    const response = NextResponse.json(apiSites);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=300');
    return response;
  } catch (error) {
    return NextResponse.json({ error: '获取资源失败' }, { status: 500 });
  }
}
