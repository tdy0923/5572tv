import { NextRequest, NextResponse } from 'next/server';

import {
  isReportRateLimited,
  reportDeadDrama,
} from '@/lib/shortdrama-dead-registry';

export const runtime = 'nodejs';

/**
 * 客户端播放失败上报死剧。
 * 仅在短剧竖屏播放器确认所有候选源均失败时调用（fire-and-forget）。
 * 服务端只登记名称用于推荐降权，不做任何探测。
 */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    if (isReportRateLimited(ip)) {
      return NextResponse.json({ error: 'too many reports' }, { status: 429 });
    }

    const body = (await request.json()) as { name?: string };
    const name = (body.name || '').trim();
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'invalid name' }, { status: 400 });
    }

    const isNew = reportDeadDrama(name);
    return NextResponse.json({ ok: true, isNew });
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}
