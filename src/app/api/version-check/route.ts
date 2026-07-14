import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.9.5',
  buildNumber: 5,
  releaseNotes:
    '5572 影视 v1.9.5 更新内容：\n\n' +
    '1. 修复短剧详情跨源冲突，播放不再张冠李戴\n' +
    '2. 修复短剧无法播放（上游源超时自动切换备用源）\n' +
    '3. 新增品牌金色开屏页面，告别启动黑屏\n' +
    '4. 新增应用内直接下载更新（自动识别 CPU 架构）\n' +
    '5. 优化应用图标（金色满版 + 5 字标）\n' +
    '6. 优化页面加载速度',
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
