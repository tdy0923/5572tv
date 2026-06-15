import { NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authInfo = await getAuthInfoFromCookie(request as any);
  if (!authInfo?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const records = await db.getAllPlayRecords(authInfo.username);

    const sorted = Object.entries(records)
      .map(([key, record]) => ({ key, ...record }))
      .sort((a, b) => (b.save_time || 0) - (a.save_time || 0))
      .slice(0, 50);

    const timeline: Record<string, typeof sorted> = {};
    for (const item of sorted) {
      const date = new Date(item.save_time || Date.now()).toLocaleDateString(
        'zh-CN',
      );
      if (!timeline[date]) timeline[date] = [];
      timeline[date].push(item);
    }

    return NextResponse.json({
      timeline,
      total: Object.keys(records).length,
    });
  } catch {
    return NextResponse.json({ error: '获取时间线失败' }, { status: 500 });
  }
}
