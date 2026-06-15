/* eslint-disable unused-imports/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = await getAuthInfoFromCookie(request);
  if (!authInfo?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const favorites = await db.getAllFavorites(authInfo.username);
    const playRecords = await db.getAllPlayRecords(authInfo.username);

    const updates: Array<{
      key: string;
      title: string;
      cover: string;
      source_name: string;
      currentEpisode: number;
      totalEpisodes: number;
    }> = [];

    for (const [key, fav] of Object.entries(favorites)) {
      if (!fav.total_episodes || fav.total_episodes <= 1) continue;

      const record = playRecords[key];
      const currentEpisode = record?.index ?? 0;
      const totalEpisodes =
        (record?.total_episodes && record.total_episodes > 0
          ? record.total_episodes
          : fav.total_episodes) || fav.total_episodes;

      if (currentEpisode > 0 && currentEpisode < totalEpisodes) {
        updates.push({
          key,
          title: fav.title || '未知',
          cover: fav.cover || '',
          source_name: fav.source_name || '',
          currentEpisode,
          totalEpisodes,
        });
      }
    }

    return NextResponse.json({ updates, count: updates.length });
  } catch (error) {
    return NextResponse.json({ error: '获取更新失败' }, { status: 500 });
  }
}
