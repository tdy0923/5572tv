import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.9.4',
  buildNumber: 4,
  releaseNotes:
    '5572 影视 v1.9.4 更新内容：\n\n' +
    '1. 修复短剧播放卡在「正在获取短剧详情」\n' +
    '2. 新增品牌开屏页面，告别启动黑屏\n' +
    '3. 优化短剧海报加载速度',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-07-14',
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(VERSION_INFO, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
