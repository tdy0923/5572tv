import { NextRequest, NextResponse } from 'next/server';

import { resolveSubtitleDownloadUrl } from '@/lib/subtitle-providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, fileId, pageUrl } = body;

    if (!provider || !fileId) {
      return NextResponse.json(
        { error: '缺少 provider 或 fileId' },
        { status: 400 },
      );
    }

    const url = await resolveSubtitleDownloadUrl({
      title: '',
      provider,
      fileId: Number(fileId),
      pageUrl,
    });

    if (!url) {
      return NextResponse.json(
        { error: '获取字幕下载链接失败（可能未配置字幕源凭据）' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('字幕下载失败:', error);
    return NextResponse.json(
      { error: '获取字幕下载链接失败' },
      { status: 500 },
    );
  }
}
