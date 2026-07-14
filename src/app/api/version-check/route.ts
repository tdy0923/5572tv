import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.9.3',
  buildNumber: 3,
  releaseNotes:
    '5572 影视 v1.9.3 更新内容：\n\n' +
    '1. 修复短剧列表海报不显示\n' +
    '2. 修复短剧栏目卡死/无响应\n' +
    '3. 优化短剧列表加载性能',
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
