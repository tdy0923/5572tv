import { NextRequest, NextResponse } from 'next/server';

import { getPlayerErrors } from '@/lib/analytics-store';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    const username = authInfo.username;

    let _operatorRole: 'owner' | 'admin';
    if (username === process.env.USERNAME) {
      _operatorRole = 'owner';
    } else {
      const userEntry = config.UserConfig.Users.find(
        (u) => u.username === username,
      );
      if (!userEntry || userEntry.role !== 'admin' || userEntry.banned) {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
      _operatorRole = 'admin';
    }

    const rawDays = request.nextUrl.searchParams.get('days');
    const parsedDays =
      rawDays === null || rawDays.trim() === '' ? NaN : Number(rawDays);
    const days = Number.isFinite(parsedDays)
      ? Math.min(Math.max(Math.floor(parsedDays), 1), 14)
      : 3;
    const summary = await getPlayerErrors(days);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: '读取播放器错误失败' }, { status: 500 });
  }
}
