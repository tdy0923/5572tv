/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getAnalyticsSummary } from '@/lib/analytics-store';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

/**
 * GET /api/admin/analytics?days=30
 * 站长/管理员查看用户行为统计
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    let isOwner = username === process.env.USERNAME;

    if (!isOwner) {
      try {
        const config = await getConfig();
        const userEntry = config.UserConfig.Users.find(
          (u) => u.username === username,
        );
        if (!userEntry || userEntry.role !== 'admin' || userEntry.banned) {
          return NextResponse.json({ error: '权限不足' }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Math.max(parseInt(searchParams.get('days') || '30') || 30, 1),
      90,
    );

    const summary = getAnalyticsSummary(days);

    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    console.error('获取用户行为统计失败:', error);
    return NextResponse.json(
      { error: '获取用户行为统计失败' },
      { status: 500 },
    );
  }
}
