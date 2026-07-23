import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.12.0',
  buildNumber: 7,
  releaseNotes:
    '5572 影视 v1.12.0 更新内容：\n\n' +
    '1. 首页焦点大图恢复横图背景+预告片视频\n' +
    '2. 修复 APP 首次进入黑框闪烁问题\n' +
    '3. 短剧播放器统一为标准播放器\n' +
    '4. 修复继续观看短剧源 400 错误\n' +
    '5. 修复豆瓣预告片 API 路由问题',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-07-23',
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(VERSION_INFO, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
