import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.9.2',
  buildNumber: 2,
  releaseNotes:
    '5572 影视 v1.9.2 更新内容：\n\n' +
    '1. 修复短剧无法播放（黑屏/卡死）\n' +
    '2. 修复切换栏目时黑屏，增加加载动画\n' +
    '3. 优化短剧播放体验',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-07-13',
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(VERSION_INFO, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
