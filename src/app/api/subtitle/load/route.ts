import { NextRequest, NextResponse } from 'next/server';

import {
  resolveSubtitleContent,
  resolveSubtitleDownloadUrl,
  SubtitleSearchResult,
} from '@/lib/subtitle-providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, fileId, pageUrl } = body as Partial<SubtitleSearchResult>;

    if (!provider) {
      return NextResponse.json({ error: '缺少 provider' }, { status: 400 });
    }

    // subhd：解析字幕内容（普通 HTTP 获取，无需凭据）
    if (provider === 'subhd' && pageUrl) {
      const content = await resolveSubtitleContent({
        title: '',
        provider: 'subhd',
        pageUrl,
      } as SubtitleSearchResult);
      if (!content) {
        return NextResponse.json(
          { error: '获取字幕内容失败' },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, content });
    }

    // opensubtitles：返回下载链接
    const url = await resolveSubtitleDownloadUrl({
      title: '',
      provider,
      fileId: Number(fileId),
      pageUrl,
    } as SubtitleSearchResult);

    if (!url) {
      return NextResponse.json(
        { error: '获取字幕下载链接失败（可能未配置字幕源凭据）' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('字幕加载失败:', error);
    return NextResponse.json({ error: '获取字幕失败' }, { status: 500 });
  }
}
