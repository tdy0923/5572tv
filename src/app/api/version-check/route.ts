import { stat } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

import { APP_RELEASE } from '@/lib/app-release';

export const runtime = 'nodejs';

async function getApkSizeMb(): Promise<number> {
  try {
    const p = path.join(
      process.cwd(),
      'static',
      'download',
      '5572tv-android.apk',
    );
    const s = await stat(p);
    if (s.size > 0) return Math.round(s.size / (1024 * 1024));
  } catch {
    // fall back to default below
  }
  return 18;
}

export async function GET(_request: NextRequest) {
  const sizeMb = await getApkSizeMb();
  return NextResponse.json(
    { ...APP_RELEASE, sizeMb },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
