/* eslint-disable no-console */

/**
 * Quick Access API
 * Provides quick access to common operations
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getConfig();
    const sources = config.SourceConfig || [];
    const users = config.UserConfig?.Users || [];
    const groups = config.UserConfig?.Tags || [];

    const activeSources = sources.filter((s: any) => !s.disabled);
    const activeUsers = users.filter((u: any) => !u.banned);

    return NextResponse.json({
      ok: true,
      stats: {
        sources: { total: sources.length, active: activeSources.length },
        users: { total: users.length, active: activeUsers.length },
        groups: groups.length,
      },
      links: {
        admin: '/admin',
        sources: '/admin?section=video-source-config',
        users: '/admin?section=user-config',
        groups: '/admin?section=user-config',
        tvbox: '/api/tvbox-export',
      },
    });
  } catch (error) {
    console.error('Quick access error:', error);
    return NextResponse.json(
      { error: 'Failed to get quick access' },
      { status: 500 },
    );
  }
}
