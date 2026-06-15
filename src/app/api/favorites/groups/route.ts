import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const groups = await db.getFavoriteGroups(authInfo.username);
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { group, action } = await request.json();
  if (!group) {
    return NextResponse.json({ error: '缺少分组名' }, { status: 400 });
  }
  if (action === 'add') {
    await db.addFavoriteGroup(authInfo.username, group);
  } else if (action === 'delete') {
    await db.deleteFavoriteGroup(authInfo.username, group);
  }
  return NextResponse.json({ ok: true });
}
